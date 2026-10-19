import type { APIRoute } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const prerender = false;

type ChatRole = "student" | "admin";
type ChatContext =
  | { client: SupabaseClient; userId: string; role: ChatRole; studentId?: string }
  | { error: Response };

type ConversationBody = { conversationId?: unknown; body?: unknown };

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    },
  });
}

/** Authenticates a student or allowlisted administrator before using service-role access. */
async function getChatContext(request: Request): Promise<ChatContext> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) {
    return { error: jsonResponse({ success: false, message: "Authentication is required." }, 401) };
  }

  const url = import.meta.env.SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: jsonResponse({ success: false, message: "Chat is not configured on the server." }, 500) };
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return { error: jsonResponse({ success: false, message: "Your session is invalid. Please sign in again." }, 401) };
  }

  const adminEmails = String(import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return { client, userId: user.id, role: "admin" };
  }

  const { data: profile, error: profileError } = await client
    .from("student_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Academy chat profile lookup failed:", profileError);
    return { error: jsonResponse({ success: false, message: "Your student profile could not be verified." }, 500) };
  }

  if (!profile) {
    return { error: jsonResponse({ success: false, message: "You are not authorized to access Academy chat." }, 403) };
  }

  return { client, userId: user.id, role: "student", studentId: profile.id };
}

/** Finds or creates the single private conversation associated with a student. */
async function getOrCreateStudentConversation(client: SupabaseClient, studentId: string) {
  const { data: existing, error: lookupError } = await client
    .from("academy_chat_conversations")
    .select("id, student_id, status, last_message_at, created_at, updated_at")
    .eq("student_id", studentId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const { data, error } = await client
    .from("academy_chat_conversations")
    .insert({ student_id: studentId })
    .select("id, student_id, status, last_message_at, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

/** Lists the admin inbox or returns one conversation and its message history. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const context = await getChatContext(request);
    if ("error" in context) return context.error;

    const conversationId = new URL(request.url).searchParams.get("conversationId");

    if (context.role === "admin" && !conversationId) {
      const { data, error } = await context.client
        .from("academy_chat_conversations")
        .select(`
          id, student_id, status, last_message_at, created_at, updated_at,
          student:student_profiles!academy_chat_conversations_student_id_fkey (
            id, user_id, first_name, last_name, display_name, avatar_url
          )
        `)
        .order("last_message_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return jsonResponse({
        success: true,
        conversations: (data ?? []).map((item) => ({
          ...item,
          student: Array.isArray(item.student) ? (item.student[0] ?? null) : item.student,
        })),
      });
    }

    let conversation;
    if (context.role === "student") {
      conversation = await getOrCreateStudentConversation(context.client, context.studentId!);
      if (conversationId && conversationId !== conversation.id) {
        return jsonResponse({ success: false, message: "Conversation not found." }, 404);
      }
    } else {
      if (!conversationId) {
        return jsonResponse({ success: false, message: "A conversation ID is required." }, 400);
      }
      const { data, error } = await context.client
        .from("academy_chat_conversations")
        .select("id, student_id, status, last_message_at, created_at, updated_at")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonResponse({ success: false, message: "Conversation not found." }, 404);
      conversation = data;
    }

    const { data: messages, error: messagesError } = await context.client
      .from("academy_chat_messages")
      .select("id, conversation_id, sender_user_id, sender_role, body, read_at, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) throw messagesError;

    return jsonResponse({ success: true, conversation, messages: messages ?? [] });
  } catch (error) {
    console.error("Academy chat GET error:", error);
    return jsonResponse({ success: false, message: "Chat could not be loaded." }, 500);
  }
};

/** Saves a message only after verifying that the sender can access its conversation. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const context = await getChatContext(request);
    if ("error" in context) return context.error;

    let body: ConversationBody;
    try {
      body = await request.json() as ConversationBody;
    } catch {
      return jsonResponse({ success: false, message: "The request body must be valid JSON." }, 400);
    }

    const messageBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!messageBody || messageBody.length > 5000) {
      return jsonResponse({ success: false, message: "Messages must contain between 1 and 5000 characters." }, 400);
    }

    let conversation;
    if (context.role === "student") {
      conversation = await getOrCreateStudentConversation(context.client, context.studentId!);
      if (body.conversationId && body.conversationId !== conversation.id) {
        return jsonResponse({ success: false, message: "Conversation not found." }, 404);
      }
    } else {
      const id = typeof body.conversationId === "string" ? body.conversationId : "";
      if (!id) return jsonResponse({ success: false, message: "Choose a conversation first." }, 400);
      const { data, error } = await context.client
        .from("academy_chat_conversations")
        .select("id, student_id, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonResponse({ success: false, message: "Conversation not found." }, 404);
      if (data.status === "closed") return jsonResponse({ success: false, message: "This conversation is closed." }, 409);
      conversation = data;
    }

    if (conversation.status === "closed") {
      return jsonResponse({ success: false, message: "This conversation is closed. Contact the Academy team to reopen it." }, 409);
    }

    const { data: message, error: insertError } = await context.client
      .from("academy_chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_user_id: context.userId,
        sender_role: context.role,
        body: messageBody,
      })
      .select("id, conversation_id, sender_user_id, sender_role, body, read_at, created_at")
      .single();

    if (insertError) throw insertError;

    const { error: updateError } = await context.client
      .from("academy_chat_conversations")
      .update({ last_message_at: message.created_at, updated_at: message.created_at })
      .eq("id", conversation.id);

    if (updateError) console.error("Chat message saved but conversation activity was not updated:", updateError);

    return jsonResponse({ success: true, message }, 201);
  } catch (error) {
    console.error("Academy chat POST error:", error);
    return jsonResponse({ success: false, message: "Your message could not be sent." }, 500);
  }
};

/** Marks messages from the other participant as read without exposing another conversation. */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const context = await getChatContext(request);
    if ("error" in context) return context.error;

    let body: ConversationBody;
    try {
      body = await request.json() as ConversationBody;
    } catch {
      return jsonResponse({ success: false, message: "The request body must be valid JSON." }, 400);
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    if (!conversationId) return jsonResponse({ success: false, message: "A conversation ID is required." }, 400);

    let query = context.client
      .from("academy_chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .is("read_at", null)
      .neq("sender_role", context.role);

    if (context.role === "student") {
      const { data: conversation, error } = await context.client
        .from("academy_chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("student_id", context.studentId!)
        .maybeSingle();
      if (error) throw error;
      if (!conversation) return jsonResponse({ success: false, message: "Conversation not found." }, 404);
    } else {
      const { data: conversation, error } = await context.client
        .from("academy_chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      if (!conversation) return jsonResponse({ success: false, message: "Conversation not found." }, 404);
    }

    const { error } = await query;
    if (error) throw error;
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Academy chat read receipt error:", error);
    return jsonResponse({ success: false, message: "Read status could not be updated." }, 500);
  }
};
