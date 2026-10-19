import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCheck, CircleUserRound, LoaderCircle, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "react-toastify";
import { getAdminSession, getSession } from "../../lib/auth";

type ChatRole = "student" | "admin";
type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: ChatRole;
  body: string;
  read_at: string | null;
  created_at: string;
};
type ChatConversation = {
  id: string;
  student_id: string;
  status: "open" | "closed";
  last_message_at: string;
  created_at: string;
  student?: { first_name?: string | null; last_name?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};

type Props = { role: ChatRole };

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Provides the private student/admin chat UI and refreshes messages while the page is open. */
export default function AcademyChat({ role }: Props) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const sessionResult = role === "admin" ? await getAdminSession() : await getSession();
    const session = sessionResult.data.session;
    if (!session) {
      window.location.replace(role === "admin" ? "/admin/login" : "/student/login");
      throw new Error("Your session has expired. Please sign in again.");
    }
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers ?? {}),
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Chat request failed.");
    return result;
  }, [role]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      if (role === "admin") {
        const result = await request("/api/academy/chat");
        const list = (result.conversations ?? []) as ChatConversation[];
        setConversations(list);
        const nextId = selectedId && list.some((item) => item.id === selectedId) ? selectedId : list[0]?.id ?? "";
        setSelectedId(nextId);
        if (nextId) {
          const detail = await request(`/api/academy/chat?conversationId=${encodeURIComponent(nextId)}`);
          setConversation(detail.conversation);
          setMessages(detail.messages ?? []);
          await request("/api/academy/chat", { method: "PATCH", body: JSON.stringify({ conversationId: nextId }) });
        } else {
          setConversation(null);
          setMessages([]);
        }
      } else {
        const result = await request("/api/academy/chat");
        setConversation(result.conversation ?? null);
        setMessages(result.messages ?? []);
        if (result.conversation?.id) {
          await request("/api/academy/chat", { method: "PATCH", body: JSON.stringify({ conversationId: result.conversation.id }) });
        }
      }
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : "Chat could not be loaded.");
    } finally {
      if (!quiet) setLoading(false);
      setRefreshing(false);
    }
  }, [request, role, selectedId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 7000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const result = await request("/api/academy/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId: conversation?.id ?? selectedId || undefined, body: draft.trim() }),
      });
      setDraft("");
      setMessages((current) => [...current, result.message as ChatMessage]);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function selectConversation(id: string) {
    setSelectedId(id);
  }

  const studentName = conversation?.student?.display_name ||
    [conversation?.student?.first_name, conversation?.student?.last_name].filter(Boolean).join(" ") ||
    "Academy student";

  return (
    <div className={role === "admin" ? "grid min-h-[650px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]" : "mx-auto max-w-5xl"}>
      {role === "admin" && (
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div><h2 className="font-semibold">Conversations</h2><p className="mt-1 text-xs text-slate-500">{conversations.length} student chats</p></div>
            <button type="button" onClick={() => { setRefreshing(true); void load(); }} aria-label="Refresh inbox" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} /></button>
          </div>
          <div className="max-h-[580px] overflow-y-auto">
            {conversations.map((item) => {
              const name = item.student?.display_name || [item.student?.first_name, item.student?.last_name].filter(Boolean).join(" ") || "Academy student";
              return <button type="button" key={item.id} onClick={() => selectConversation(item.id)} className={`block w-full border-b border-slate-100 p-4 text-left transition dark:border-slate-800 ${selectedId === item.id ? "bg-sky-50 dark:bg-sky-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold"><CircleUserRound size={17} className="text-sky-600" />{name}</span>
                <span className="mt-2 block text-xs text-slate-500">{item.status === "closed" ? "Closed" : "Open"} · {formatMessageTime(item.last_message_at)}</span>
              </button>;
            })}
            {!loading && conversations.length === 0 && <p className="p-5 text-sm text-slate-500">No student conversations yet.</p>}
          </div>
        </aside>
      )}
      <section className="flex min-h-[650px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><MessageCircle size={21} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{role === "admin" ? studentName : "CloudTweak Academy Support"}</h2>
            <p className="mt-1 text-xs text-slate-500">{conversation?.status === "closed" ? "Conversation closed" : "Private conversation · replies refresh automatically"}</p>
          </div>
          <button type="button" onClick={() => { setRefreshing(true); void load(); }} aria-label="Refresh messages" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/40 sm:p-6">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={18} />Loading conversation…</div> :
            messages.map((message) => {
              const own = message.sender_role === role;
              return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${own ? "rounded-br-md bg-sky-700 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <div className={`mt-2 flex items-center justify-end gap-1 text-[10px] ${own ? "text-sky-100" : "text-slate-400"}`}>{formatMessageTime(message.created_at)}{own && message.read_at && <CheckCheck size={13} aria-label="Read" />}</div>
                </div>
              </div>;
            })}
          {!loading && messages.length === 0 && <div className="flex h-full flex-col items-center justify-center py-16 text-center"><MessageCircle size={30} className="text-slate-300" /><p className="mt-3 text-sm font-medium">Start the conversation</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Send a message to the Academy support team. Your conversation will stay in your portal.</p></div>}
        </div>
        <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <label className="sr-only" htmlFor="academy-chat-message">Your message</label>
          <textarea id="academy-chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Write a message…" disabled={sending || conversation?.status === "closed" || (role === "admin" && !conversation)} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          <button type="submit" disabled={sending || !draft.trim() || conversation?.status === "closed" || (role === "admin" && !conversation)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} /> <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button>
        </form>
      </section>
    </div>
  );
}
