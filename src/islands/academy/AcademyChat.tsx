import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCheck,
  CircleUserRound,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
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
  student?: {
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type Props = { role: ChatRole; floating?: boolean };

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

/** Provides the private student/admin chat UI and refreshes messages while the page is open. */
export default function AcademyChat({ role, floating = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const sessionResult =
        role === "admin" ? await getAdminSession() : await getSession();
      const session = sessionResult.data.session;
      if (!session) {
        window.location.replace(
          role === "admin" ? "/admin/login" : "/student/login"
        );
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
      if (!response.ok)
        throw new Error(result.message || "Chat request failed.");
      return result;
    },
    [role]
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);

      try {
        if (role === "admin") {
          // Fetch the list of conversations available to the admin.
          const result = await request("/api/academy/chat");
          const list = (result.conversations ?? []) as ChatConversation[];

          setConversations(list);

          // Keep the selected conversation if it still exists; otherwise select the first.
          const nextId =
            selectedId && list.some((item) => item.id === selectedId)
              ? selectedId
              : (list[0]?.id ?? "");

          setSelectedId(nextId);

          if (nextId) {
            // Fetch the selected conversation and its messages.
            const detail = await request(
              `/api/academy/chat?conversationId=${encodeURIComponent(nextId)}`
            );

            setConversation(detail.conversation);
            setMessages(detail.messages ?? []);
          } else {
            // Clear the conversation view when no conversations are available.
            setConversation(null);
            setMessages([]);
          }
        } else {
          // Fetch the student's conversation and its messages.
          const result = await request("/api/academy/chat");

          setConversation(result.conversation ?? null);
          setMessages(result.messages ?? []);
        }
      } catch (error) {
        // Only display errors for foreground loads, not quiet background refreshes.
        if (!quiet) {
          toast.error(
            error instanceof Error ? error.message : "Chat could not be loaded."
          );
        }
      } finally {
        // Only stop the main loading indicator for foreground loads.
        if (!quiet) setLoading(false);

        setRefreshing(false);
      }
    },
    [request, role, selectedId]
  );

  useEffect(() => {
    // Open the conversation referenced by an admin notification link.
    if (role === "admin") {
      const conversationId = new URLSearchParams(window.location.search).get(
        "conversationId"
      );
      if (conversationId) setSelectedId(conversationId);
    }
  }, [role]);

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
        body: JSON.stringify({
          conversationId: (conversation?.id ?? selectedId) || undefined,
          body: draft.trim(),
        }),
      });
      setDraft("");
      setMessages((current) => [...current, result.message as ChatMessage]);
      await load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  function selectConversation(id: string) {
    setSelectedId(id);
  }

  const studentName =
    conversation?.student?.display_name ||
    [conversation?.student?.first_name, conversation?.student?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Academy student";

  const chatPanel = (
    <div
      className={
        role === "admin"
          ? "grid min-h-[650px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"
          : floating
            ? "flex h-full min-h-0 min-w-0 flex-col"
            : "mx-auto max-w-5xl"
      }
    >
      {role === "admin" && (
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div>
              <h2 className="font-semibold">Conversations</h2>
              <p className="mt-1 text-xs text-slate-500">
                {conversations.length} student chats
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void load();
              }}
              aria-label="Refresh inbox"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="max-h-[580px] overflow-y-auto">
            {conversations.map((item) => {
              const name =
                item.student?.display_name ||
                [item.student?.first_name, item.student?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                "Academy student";
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => selectConversation(item.id)}
                  className={`block w-full border-b border-slate-100 p-4 text-left transition dark:border-slate-800 ${selectedId === item.id ? "bg-[#154DD8]/10 dark:bg-[#154DD8]/20" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <CircleUserRound size={17} className="text-[#154DD8]" />
                    {name}
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">
                    {item.status === "closed" ? "Closed" : "Open"} ·{" "}
                    {formatMessageTime(item.last_message_at)}
                  </span>
                </button>
              );
            })}
            {!loading && conversations.length === 0 && (
              <p className="p-5 text-sm text-slate-500">
                No student conversations yet.
              </p>
            )}
          </div>
        </aside>
      )}
      <section
        className={
          floating && role === "student"
            ? "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white dark:bg-slate-950"
            : "flex min-h-[650px] min-w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        }
      >
        <header className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#154DD8]/10 text-[#154DD8] dark:bg-[#154DD8]/20 dark:text-blue-300">
            <MessageCircle size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">
              {role === "admin" ? studentName : "CloudTweak Academy Support"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {conversation?.status === "closed"
                ? "Conversation closed"
                : "Private conversation · replies refresh automatically"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            aria-label="Refresh messages"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/70 p-4 dark:bg-slate-900/40 sm:p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              <LoaderCircle className="mr-2 animate-spin" size={18} />
              Loading conversation…
            </div>
          ) : (
            messages.map((message) => {
              const own = message.sender_role === role;
              return (
                <div
                  key={message.id}
                  className={`flex ${own ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${own ? "rounded-br-md bg-[#154DD8] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                    <div
                      className={`mt-2 flex items-center justify-end gap-1 text-[10px] ${own ? "text-blue-100" : "text-slate-400"}`}
                    >
                      {formatMessageTime(message.created_at)}
                      {own && message.read_at && (
                        <CheckCheck size={13} aria-label="Read" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {!loading && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <MessageCircle size={30} className="text-slate-300" />
              <p className="mt-3 text-sm font-medium">Start the conversation</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Send a message to the Academy support team. Your conversation
                will stay in your portal.
              </p>
            </div>
          )}
        </div>
        <form
          onSubmit={handleSend}
          className="flex items-end gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5"
        >
          <label className="sr-only" htmlFor="academy-chat-message">
            Your message
          </label>
          <textarea
            id="academy-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            rows={2}
            placeholder="Write a message…"
            disabled={
              sending ||
              conversation?.status === "closed" ||
              (role === "admin" && !conversation)
            }
            className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#154DD8] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={
              sending ||
              !draft.trim() ||
              conversation?.status === "closed" ||
              (role === "admin" && !conversation)
            }
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#154DD8] px-4 text-sm font-semibold text-white transition hover:bg-[#103FB5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />{" "}
            <span className="hidden sm:inline">
              {sending ? "Sending…" : "Send"}
            </span>
          </button>
        </form>
      </section>
    </div>
  );

  if (role === "student" && floating) {
    return (
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end">
        {isOpen && (
          <div className="mb-3 flex h-[min(680px,calc(100dvh-7rem))] min-h-0 w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            {chatPanel}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={
            isOpen ? "Close Academy support chat" : "Open Academy support chat"
          }
          aria-expanded={isOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#154DD8] text-white shadow-xl ring-4 ring-white/70 transition hover:scale-105 hover:bg-[#103FB5] focus:outline-none focus:ring-4 focus:ring-[#154DD8]/40 dark:ring-slate-900"
        >
          {isOpen ? (
            <span className="text-2xl leading-none" aria-hidden="true">
              ×
            </span>
          ) : (
            <MessageCircle size={25} />
          )}
        </button>
      </div>
    );
  }

  return chatPanel;
}
