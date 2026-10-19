import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// Authenticates the administrator before exposing student or program choices.
async function getAdminClient(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token)
    return { error: "Authentication is required.", status: 401 as const };
  const url = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = (import.meta.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!url || !serviceRoleKey || allowedEmails.length === 0)
    return {
      error: "The announcement service is not configured.",
      status: 500 as const,
    };
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user?.email)
    return { error: "Your admin session is invalid.", status: 401 as const };
  if (!allowedEmails.includes(user.email.toLowerCase()))
    return {
      error: "You are not authorized to view these options.",
      status: 403 as const,
    };
  return { client, error: null };
}

// Supplies human-readable options with stable IDs for the announcement composer.
export const GET: APIRoute = async ({ request }) => {
  try {
    const admin = await getAdminClient(request);
    if (admin.error || !admin.client)
      return jsonResponse(
        { success: false, message: admin.error },
        admin.status
      );
    const lookup = new URL(request.url).searchParams.get("type");

    if (lookup === "programs") {
      const { data, error } = await admin.client
        .from("academy_programs")
        .select("id,title,status")
        .order("title", { ascending: true })
        .limit(2000);
      if (error) {
        console.error("Announcement program lookup failed:", error);
        return jsonResponse(
          { success: false, message: "Programs could not be loaded." },
          500
        );
      }
      return jsonResponse({
        success: true,
        programs: (data ?? []).map((row) => ({
          id: row.id,
          title: row.title || "Untitled program",
          status: row.status || "unknown",
        })),
      });
    }

    if (lookup === "students") {
      const { data: profiles, error: profileError } = await admin.client
        .from("student_profiles")
        .select("id,user_id")
        .not("user_id", "is", null)
        .limit(10000);
      if (profileError) {
        console.error(
          "Announcement student profile lookup failed:",
          profileError
        );
        return jsonResponse(
          { success: false, message: "Students could not be loaded." },
          500
        );
      }
      const profilesByUserId = new Map(
        (profiles ?? []).map((profile) => [profile.user_id, profile])
      );
      const users: Array<{
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      }> = [];
      // Fetch auth users in pages so each student can be shown by name and email.
      for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.client.auth.admin.listUsers({
          page,
          perPage: 500,
        });
        if (error) {
          console.error("Announcement auth user lookup failed:", error);
          return jsonResponse(
            { success: false, message: "Student names could not be loaded." },
            500
          );
        }
        users.push(...data.users);
        if (data.users.length < 500) break;
      }
      const students = users
        .flatMap((user) => {
          const profile = profilesByUserId.get(user.id);
          if (!profile) return [];
          const metadata = user.user_metadata ?? {};
          const firstName =
            typeof metadata.first_name === "string" ? metadata.first_name : "";
          const lastName =
            typeof metadata.last_name === "string" ? metadata.last_name : "";
          const name =
            typeof metadata.full_name === "string"
              ? metadata.full_name
              : typeof metadata.name === "string"
                ? metadata.name
                : `${firstName} ${lastName}`.trim();
          const email = user.email ?? "";
          return [
            {
              id: profile.id,
              name: name.trim() || email || "Student",
              email,
              label:
                [name.trim(), email].filter(Boolean).join(" — ") || "Student",
            },
          ];
        })
        .sort((a, b) => a.label.localeCompare(b.label));
      return jsonResponse({ success: true, students });
    }
    return jsonResponse(
      { success: false, message: "A valid lookup type is required." },
      400
    );
  } catch (error) {
    console.error("Unexpected announcement lookup error:", error);
    return jsonResponse(
      {
        success: false,
        message: "An unexpected error occurred while loading options.",
      },
      500
    );
  }
};
