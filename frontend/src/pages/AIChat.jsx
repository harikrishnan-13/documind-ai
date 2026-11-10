import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bot,
  Menu,
  PanelLeftOpen,
  Send,
  Sparkles,
  LoaderCircle,
  AlertCircle,
  Archive,
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

function getErrorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
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

  return error?.message || fallback;
}

function getUserMessageFromError(error) {
  return (
    error?.response?.data?.data?.user_message ||
    error?.response?.data?.user_message ||
    null
  );
}

function isUnresolvedUserMessage(message) {
  return (
    message.role === "user" &&
    (message.status === "pending" ||
      message.status === "failed" ||
      message.pending === true ||
      message.failed === true)
  );
}

export default function AIChat() {
  // --------------------------------------------------
  // Conversation states
  // --------------------------------------------------

  const [conversations, setConversations] = useState([]);

  const [archivedConversations, setArchivedConversations] = useState([]);

  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const [messages, setMessages] = useState([]);

  // --------------------------------------------------
  // UI states
  // --------------------------------------------------

  const [input, setInput] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [isManagingConversationId, setIsManagingConversationId] =
    useState(null);

  const [showArchived, setShowArchived] = useState(false);

  const [pageError, setPageError] = useState("");

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --------------------------------------------------
  // Refs
  // --------------------------------------------------

  const messagesEndRef = useRef(null);

  const loadedConversationRef = useRef(null);

  const userHasSelectedRef = useRef(false);

  // --------------------------------------------------
  // Load active conversations
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

  // --------------------------------------------------
  // Load archived conversations
  // --------------------------------------------------

  const loadArchivedConversations = useCallback(async () => {
    try {
      setIsLoadingArchived(true);

      const response = await api.get("/conversations/archived/");

      const archivedList = normalizeConversationList(response.data);

      setArchivedConversations(archivedList);

      return archivedList;
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Unable to load archived conversations."),
      );

      throw error;
    } finally {
      setIsLoadingArchived(false);
    }
  }, []);

  // --------------------------------------------------
  // Reload messages from the database
  // --------------------------------------------------

  const refreshConversationMessages = useCallback(async (conversationId) => {
    const response = await api.get(`/conversations/${conversationId}/`);

    const conversationMessages = Array.isArray(response.data?.messages)
      ? response.data.messages
      : [];

    setMessages(conversationMessages);

    loadedConversationRef.current = conversationId;

    return conversationMessages;
  }, []);

  // --------------------------------------------------
  // Initial conversation loading
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function initializeChat() {
      try {
        const response = await api.get("/conversations/");

        if (!active) return;

        const conversationList = normalizeConversationList(response.data);

        setConversations(conversationList);

        // Reopen the latest active conversation after refresh.
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
  // Load selected conversation and messages
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    // Avoid unnecessary fetching for a newly created conversation.
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
  // Scroll to latest message
  // --------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  // --------------------------------------------------
  // Current conversation information
  // --------------------------------------------------

  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ||
    archivedConversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );

  const selectedConversationIsArchived =
    selectedConversation?.is_archived === true ||
    archivedConversations.some(
      (conversation) => conversation.id === selectedConversationId,
    );

  // Do not allow another message while a previous user message
  // is pending or failed. The backend also enforces this rule.
  const hasUnresolvedMessage = messages.some(isUnresolvedUserMessage);

  // --------------------------------------------------
  // Start a new conversation
  // --------------------------------------------------

  function handleNewChat() {
    if (isSending || isManagingConversationId) return;

    userHasSelectedRef.current = true;

    loadedConversationRef.current = null;

    setSelectedConversationId(null);

    setMessages([]);

    setInput("");

    setPageError("");

    setShowArchived(false);

    setMobileSidebarOpen(false);
  }

  // --------------------------------------------------
  // Select an existing conversation
  // --------------------------------------------------

  function handleSelectConversation(conversationId) {
    if (isSending || isManagingConversationId) return;

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
  // Toggle active / archived conversation section
  // --------------------------------------------------

  const handleToggleArchived = useCallback(
    async (show) => {
      setShowArchived(show);

      if (show) {
        try {
          await loadArchivedConversations();
        } catch {
          // Error is already displayed through pageError.
        }
      }
    },
    [loadArchivedConversations],
  );

  // --------------------------------------------------
  // Archive conversation
  // --------------------------------------------------

  const handleArchiveConversation = useCallback(
    async (conversationId) => {
      if (isSending || isManagingConversationId) return;

      try {
        setIsManagingConversationId(conversationId);
        setPageError("");

        await api.post(`/conversations/${conversationId}/archive/`);

        // If the current conversation is archived, clear the chat.
        if (selectedConversationId === conversationId) {
          loadedConversationRef.current = null;

          setSelectedConversationId(null);

          setMessages([]);

          setInput("");
        }

        await loadConversations();

        // Refresh archived list if it is currently visible.
        if (showArchived) {
          await loadArchivedConversations();
        }
      } catch (error) {
        setPageError(getErrorMessage(error, "Unable to archive conversation."));
      } finally {
        setIsManagingConversationId(null);
      }
    },
    [
      isSending,
      isManagingConversationId,
      selectedConversationId,
      showArchived,
      loadConversations,
      loadArchivedConversations,
    ],
  );

  // --------------------------------------------------
  // Restore conversation
  // --------------------------------------------------

  const handleRestoreConversation = useCallback(
    async (conversationId) => {
      if (isSending || isManagingConversationId) return;

      try {
        setIsManagingConversationId(conversationId);
        setPageError("");

        await api.post(`/conversations/${conversationId}/restore/`);

        await loadConversations();

        await loadArchivedConversations();

        // If the restored conversation is currently selected,
        // switch to the active conversations section.
        if (selectedConversationId === conversationId) {
          setShowArchived(false);
        }
      } catch (error) {
        setPageError(getErrorMessage(error, "Unable to restore conversation."));
      } finally {
        setIsManagingConversationId(null);
      }
    },
    [
      isSending,
      isManagingConversationId,
      selectedConversationId,
      loadConversations,
      loadArchivedConversations,
    ],
  );

  // --------------------------------------------------
  // Permanently delete conversation
  // --------------------------------------------------

  const handleDeleteConversation = useCallback(
    async (conversation) => {
      if (isSending || isManagingConversationId) return;

      const conversationTitle = conversation.title || "New conversation";

      const confirmed = window.confirm(
        `Permanently delete "${conversationTitle}"?\n\nThis will also delete all its messages. This action cannot be undone.`,
      );

      if (!confirmed) return;

      try {
        setIsManagingConversationId(conversation.id);
        setPageError("");

        await api.delete(`/conversations/${conversation.id}/`);

        // Clear selected conversation if it was deleted.
        if (selectedConversationId === conversation.id) {
          loadedConversationRef.current = null;

          setSelectedConversationId(null);

          setMessages([]);

          setInput("");
        }

        await loadConversations();

        await loadArchivedConversations();
      } catch (error) {
        setPageError(getErrorMessage(error, "Unable to delete conversation."));
      } finally {
        setIsManagingConversationId(null);
      }
    },
    [
      isSending,
      isManagingConversationId,
      selectedConversationId,
      loadConversations,
      loadArchivedConversations,
    ],
  );

  // --------------------------------------------------
  // Send message to Django and OpenAI
  // --------------------------------------------------

  async function handleSendMessage(event) {
    event?.preventDefault();

    const messageText = input.trim();

    if (
      !messageText ||
      isSending ||
      isLoadingMessages ||
      isManagingConversationId ||
      selectedConversationIsArchived ||
      hasUnresolvedMessage
    ) {
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
      status: "pending",
      pending: true,
    };

    setMessages((previous) => [...previous, temporaryMessage]);

    // Keep this outside try so the catch block can recover
    // the persisted message if the API request fails.
    let conversationId = selectedConversationId;

    try {
      // Create a conversation when the first message is submitted.
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

        loadedConversationRef.current = conversationId;

        setSelectedConversationId(conversationId);

        setConversations((previous) => [
          newConversation,
          ...previous.filter((item) => item.id !== conversationId),
        ]);
      }

      // Submit the message to the multi-turn conversation endpoint.
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

      // Replace temporary message with persisted messages.
      setMessages((previous) => [
        ...previous.filter((item) => item.id !== temporaryMessageId),
        result.user_message,
        result.assistant_message,
      ]);

      // Refresh conversation ordering and metadata.
      try {
        await loadConversations();
      } catch {
        // The message was sent successfully.
        // Keep the chat usable if the list refresh fails.
      }
    } catch (error) {
      let recoveredMessages = false;

      // Some backend error responses may include the failed
      // persisted user message directly.
      const persistedUserMessage = getUserMessageFromError(error);

      if (persistedUserMessage?.id) {
        setMessages((previous) => [
          ...previous.filter((item) => item.id !== temporaryMessageId),
          persistedUserMessage,
        ]);

        recoveredMessages = true;
      }

      // If the error response did not include the database message,
      // reload the conversation. This recovers its real UUID/status.
      if (!recoveredMessages && conversationId) {
        try {
          const serverMessages =
            await refreshConversationMessages(conversationId);

          const matchingMessage = [...serverMessages]
            .reverse()
            .find(
              (item) => item.role === "user" && item.content === messageText,
            );

          if (matchingMessage) {
            recoveredMessages = true;
          } else {
            // The request may have failed before the backend saved it.
            // Keep a local failed message so the user can submit it again.
            setMessages((previous) => [
              ...serverMessages,
              {
                ...temporaryMessage,
                status: "failed",
                pending: false,
                failed: true,
                error_message: getErrorMessage(error),
              },
            ]);
          }
        } catch {
          // The server could not be reached to recover the message.
          // Keep the message locally and allow the user to submit it again.
          setMessages((previous) =>
            previous.map((item) =>
              item.id === temporaryMessageId
                ? {
                    ...item,
                    status: "failed",
                    pending: false,
                    failed: true,
                    error_message:
                      "Unable to confirm whether the message was saved. Please retry.",
                  }
                : item,
            ),
          );
        }
      }

      if (!recoveredMessages && !conversationId) {
        setMessages((previous) =>
          previous.map((item) =>
            item.id === temporaryMessageId
              ? {
                  ...item,
                  status: "failed",
                  pending: false,
                  failed: true,
                  error_message: getErrorMessage(error),
                }
              : item,
          ),
        );
      }

      setPageError(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  // --------------------------------------------------
  // Retry a failed message using its original database UUID
  // --------------------------------------------------

  async function handleRetryMessage(message) {
    if (
      isSending ||
      isManagingConversationId ||
      selectedConversationIsArchived
    ) {
      return;
    }

    // A temporary message means the backend did not return
    // a persisted UUID. Let the user submit it as a new message.
    if (typeof message.id !== "string" || message.id.startsWith("temporary-")) {
      setMessages((previous) =>
        previous.filter((item) => item.id !== message.id),
      );

      setInput(message.content);

      setPageError(
        "This message was not saved on the server. Submit it again to retry.",
      );

      return;
    }

    if (!selectedConversationId) {
      setPageError("Conversation not found. Please reload and try again.");
      return;
    }

    if (message.status !== "failed" && message.failed !== true) {
      return;
    }

    setPageError("");

    setIsSending(true);

    // Immediately show the pending state while retrying.
    setMessages((previous) =>
      previous.map((item) =>
        item.id === message.id
          ? {
              ...item,
              status: "pending",
              pending: true,
              failed: false,
              error_message: "",
            }
          : item,
      ),
    );

    try {
      const response = await api.post(
        `/conversations/${selectedConversationId}/messages/${message.id}/retry/`,
      );

      const result = response.data?.data;

      if (!result?.user_message || !result?.assistant_message) {
        throw new Error("The server returned an unexpected retry response.");
      }

      // The backend retries the original database message.
      // Do not create a duplicate user message in React.
      setMessages((previous) => [
        ...previous.filter(
          (item) =>
            item.id !== message.id && item.id !== result.assistant_message.id,
        ),
        result.user_message,
        result.assistant_message,
      ]);

      try {
        await loadConversations();
      } catch {
        // Retry succeeded; conversation list refresh is non-critical.
      }
    } catch (error) {
      // Ask the backend for the latest persisted status.
      // This is important if the retry failed after the DB was updated.
      try {
        await refreshConversationMessages(selectedConversationId);
      } catch {
        // Keep the local message available if the refresh also fails.
        setMessages((previous) =>
          previous.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  status: "failed",
                  pending: false,
                  failed: true,
                  error_message: getErrorMessage(error),
                }
              : item,
          ),
        );
      }

      setPageError(getErrorMessage(error, "Unable to retry this message."));
    } finally {
      setIsSending(false);
    }
  }

  // --------------------------------------------------
  // Determine sidebar loading state
  // --------------------------------------------------

  const isSidebarLoading = showArchived
    ? isLoadingArchived
    : isLoadingConversations;

  const isChatDisabled =
    isSending ||
    isLoadingMessages ||
    Boolean(isManagingConversationId) ||
    selectedConversationIsArchived ||
    hasUnresolvedMessage;

  const isRetryDisabled =
    isSending ||
    Boolean(isManagingConversationId) ||
    selectedConversationIsArchived;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

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
          w-72 transform transition-all duration-300
          lg:relative lg:translate-x-0
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-72"}
        `}
      >
        <ConversationSidebar
          conversations={conversations}
          archivedConversations={archivedConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onArchiveConversation={handleArchiveConversation}
          onRestoreConversation={handleRestoreConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isSidebarLoading}
          isDisabled={isSending || Boolean(isManagingConversationId)}
          isManagingConversationId={isManagingConversationId}
          collapsed={sidebarCollapsed}
          onClose={() => setMobileSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed((previous) => !previous)}
          mobile={mobileSidebarOpen}
          showArchived={showArchived}
          onToggleArchived={handleToggleArchived}
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

            {selectedConversationIsArchived ? "Archived" : "Ready to assist"}
          </div>
        </header>

        {/* Archived conversation notice */}
        {selectedConversationIsArchived && (
          <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Archive size={17} className="shrink-0" />

            <p className="min-w-0">
              This conversation is archived. Restore it before sending new
              messages.
            </p>
          </div>
        )}

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

                {!selectedConversationIsArchived && (
                  <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isChatDisabled}
                        onClick={() => setInput(prompt)}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 sm:last:col-span-2"
                      >
                        <Sparkles size={16} className="mb-2 text-blue-600" />

                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation messages */}
            {!isLoadingMessages &&
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={() => handleRetryMessage(message)}
                  retryDisabled={isRetryDisabled}
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
            <div
              role="alert"
              className="flex w-full items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
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
                placeholder={
                  selectedConversationIsArchived
                    ? "Restore this conversation to continue..."
                    : hasUnresolvedMessage
                      ? "Retry the failed message to continue..."
                      : "Message DocuMind AI..."
                }
                rows={1}
                maxLength={10000}
                disabled={isChatDisabled}
                className="max-h-36 min-h-11 flex-1 resize-y border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || isChatDisabled}
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
