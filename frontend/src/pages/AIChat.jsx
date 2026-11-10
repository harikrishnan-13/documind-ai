import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bot,
  Menu,
  PanelLeftOpen,
  Send,
  Sparkles,
  Plus,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";

import ConversationSidebar from "../components/chat/ConversationSidebar";
import ChatMessage from "../components/chat/ChatMessage";

const SUGGESTED_PROMPTS = [
  "Explain how an ERP purchase order works.",
  "What is the difference between an invoice and a purchase order?",
  "Explain the payment disbursement process.",
];

function normalizeConversationList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return error?.message || "Something went wrong. Please try again.";
}

export default function AIChat() {
  const [conversations, setConversations] = useState([]);

  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [pageError, setPageError] = useState("");

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef(null);

  const loadedConversationRef = useRef(null);

  const userHasSelectedRef = useRef(false);

  // --------------------------------------------------
  // Load conversation list from Django.
  // --------------------------------------------------

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get("/conversations/");

      const conversationList = normalizeConversationList(response.data);

      setConversations(conversationList);

      return conversationList;
    } catch (error) {
      setPageError(getErrorMessage(error));

      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeChat() {
      try {
        const response = await api.get("/conversations/");

        if (!active) return;

        const conversationList = normalizeConversationList(response.data);

        setConversations(conversationList);

        // Automatically reopen the latest conversation
        // when the user refreshes the browser.
        if (!userHasSelectedRef.current && conversationList.length > 0) {
          setSelectedConversationId(conversationList[0].id);
        }
      } catch (error) {
        if (active) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoadingConversations(false);
        }
      }
    }

    initializeChat();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Load selected conversation and its messages.
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    // A newly created conversation has no history to fetch.
    if (loadedConversationRef.current === selectedConversationId) {
      return;
    }

    let active = true;

    async function loadConversationDetails() {
      setIsLoadingMessages(true);
      setMessages([]);
      setPageError("");

      try {
        const response = await api.get(
          `/conversations/${selectedConversationId}/`,
        );

        if (!active) return;

        const conversation = response.data;

        setMessages(
          Array.isArray(conversation.messages) ? conversation.messages : [],
        );

        loadedConversationRef.current = selectedConversationId;
      } catch (error) {
        if (active) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadConversationDetails();

    return () => {
      active = false;
    };
  }, [selectedConversationId]);

  // --------------------------------------------------
  // Scroll to the latest message.
  // --------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  // --------------------------------------------------
  // Start a new conversation.
  // --------------------------------------------------

  function handleNewChat() {
    if (isSending) return;

    userHasSelectedRef.current = true;

    loadedConversationRef.current = null;

    setSelectedConversationId(null);

    setMessages([]);

    setInput("");

    setPageError("");

    setMobileSidebarOpen(false);
  }

  // --------------------------------------------------
  // Select an existing conversation.
  // --------------------------------------------------

  function handleSelectConversation(conversationId) {
    if (isSending) return;

    userHasSelectedRef.current = true;

    if (conversationId === selectedConversationId) {
      setMobileSidebarOpen(false);
      return;
    }

    loadedConversationRef.current = null;

    setSelectedConversationId(conversationId);

    setInput("");

    setPageError("");

    setMobileSidebarOpen(false);
  }

  // --------------------------------------------------
  // Send message to Django and OpenAI.
  // --------------------------------------------------

  async function handleSendMessage(event) {
    event?.preventDefault();

    const messageText = input.trim();

    if (!messageText || isSending || isLoadingMessages) {
      return;
    }

    setInput("");

    setPageError("");

    setIsSending(true);

    const temporaryMessageId = `temporary-${Date.now()}`;

    const temporaryMessage = {
      id: temporaryMessageId,
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((previous) => [...previous, temporaryMessage]);

    try {
      let conversationId = selectedConversationId;

      // Create the conversation only when its first
      // message is submitted.
      if (!conversationId) {
        const title =
          messageText.length > 60
            ? `${messageText.slice(0, 57)}...`
            : messageText;

        const createResponse = await api.post("/conversations/", {
          title,
        });

        const newConversation = createResponse.data;

        conversationId = newConversation.id;

        if (!conversationId) {
          throw new Error("Conversation could not be created.");
        }

        userHasSelectedRef.current = true;

        // Prevent the detail-loading effect from fetching
        // an empty conversation while its first message
        // is being submitted.
        loadedConversationRef.current = conversationId;

        setSelectedConversationId(conversationId);

        setConversations((previous) => [newConversation, ...previous]);
      }

      // Send message to the multi-turn conversation endpoint.
      const response = await api.post(
        `/conversations/${conversationId}/messages/`,
        {
          message: messageText,
        },
      );

      const result = response.data?.data;

      if (!result?.user_message || !result?.assistant_message) {
        throw new Error("The server returned an unexpected response.");
      }

      // Replace temporary message with the saved user message,
      // then append the assistant response.
      setMessages((previous) => [
        ...previous.filter((item) => item.id !== temporaryMessageId),
        result.user_message,
        result.assistant_message,
      ]);

      // Refresh sidebar metadata and ordering.
      try {
        await loadConversations();
      } catch {
        // Message was successfully sent.
        // Keep the chat usable if sidebar refresh fails.
      }
    } catch (error) {
      setMessages((previous) =>
        previous.map((item) =>
          item.id === temporaryMessageId
            ? {
                ...item,
                pending: false,
                failed: true,
              }
            : item,
        ),
      );

      setPageError(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  // --------------------------------------------------
  // Retry a failed message.
  // --------------------------------------------------

  function handleRetryMessage(message) {
    if (isSending) return;

    setMessages((previous) =>
      previous.filter((item) => item.id !== message.id),
    );

    setInput(message.content);

    setPageError("");
  }

  // --------------------------------------------------
  // Current conversation information.
  // --------------------------------------------------

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  return (
    <div className="flex h-[100dvh] min-h-[520px] w-full overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close conversation sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-all duration-300
          lg:relative lg:translate-x-0
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"}
          w-72
        `}
      >
        <ConversationSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          isLoading={isLoadingConversations}
          isDisabled={isSending}
          collapsed={sidebarCollapsed}
          onClose={() => setMobileSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* Main chat area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile sidebar button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open conversation history"
            >
              <Menu size={21} />
            </button>

            {/* Expand collapsed desktop sidebar */}
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:block"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Bot size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                {selectedConversation?.title || "New Chat"}
              </h1>

              <p className="text-xs text-slate-500">
                AI-powered document assistant
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ready to assist
          </div>
        </header>

        {/* Messages section */}
        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            {/* Loading conversation */}
            {isLoadingMessages && (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <LoaderCircle size={19} className="animate-spin" />
                Loading conversation...
              </div>
            )}

            {/* Empty state */}
            {!isLoadingMessages && messages.length === 0 && (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Sparkles size={30} />
                </div>

                <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                  How can I help you today?
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Ask questions, understand business documents, and explore
                  information with DocuMind AI.
                </p>

                <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isSending}
                      onClick={() => setInput(prompt)}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 sm:last:col-span-2"
                    >
                      <Sparkles size={16} className="mb-2 text-blue-600" />

                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation messages */}
            {!isLoadingMessages &&
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={() => handleRetryMessage(message)}
                />
              ))}

            {/* Assistant response loading */}
            {isSending && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Bot size={19} />
                </div>

                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle size={16} className="animate-spin" />
                    DocuMind AI is thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Error notification */}
        {pageError && (
          <div className="mx-auto mb-2 flex w-full max-w-4xl items-start gap-2 px-3 sm:px-6">
            <div className="flex w-full items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />

              <p className="min-w-0 flex-1 break-words">{pageError}</p>

              <button
                type="button"
                onClick={() => setPageError("")}
                className="shrink-0 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message composer */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-4 sm:px-6">
          <form
            onSubmit={handleSendMessage}
            className="mx-auto w-full max-w-4xl"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage(event);
                  }
                }}
                placeholder="Message DocuMind AI..."
                rows={1}
                maxLength={10000}
                disabled={isSending || isLoadingMessages}
                className="max-h-36 min-h-11 flex-1 resize-y border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || isSending || isLoadingMessages}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                {isSending ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : (
                  <Send size={19} />
                )}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
              <span>Enter to send · Shift + Enter for a new line</span>

              <span>{input.length}/10000</span>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}
