import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import {
  ArrowLeft,
  Bot,
  FileText,
  LoaderCircle,
  Plus,
  Send,
  Sparkles,
  UserRound,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messageIdRef = useRef(0);

  // Scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  // Handle API errors.
  const getErrorMessage = (err) => {
    const responseData = err.response?.data;

    if (responseData?.error) {
      return responseData.error;
    }

    if (responseData?.detail) {
      return responseData.detail;
    }

    if (responseData?.message) {
      return responseData.message;
    }

    if (err.code === "ECONNABORTED") {
      return "The request took too long. Please try again.";
    }

    if (!err.response) {
      return err.message === "The AI response was empty."
        ? err.message
        : "Unable to connect to the server. Please check your connection.";
    }

    return "Something went wrong while generating the response.";
  };

  // Send a message to the Django AI API.
  const handleSend = async (event) => {
    event?.preventDefault();

    const messageText = input.trim();

    if (!messageText || isLoading) {
      return;
    }

    const userMessageId = ++messageIdRef.current;

    const userMessage = {
      id: userMessageId,
      role: "user",
      content: messageText,
    };

    setMessages((previous) => [...previous, userMessage]);

    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/ai/chat/", {
        message: messageText,
      });

      // Expected backend response:
      // response.data.data.answer
      const answer = response.data?.data?.answer;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The AI response was empty.");
      }

      const assistantMessage = {
        id: ++messageIdRef.current,
        role: "assistant",
        content: answer.trim(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (err) {
      console.error("AI chat request failed:", err);

      // Remove failed user message so it can be retried.
      setMessages((previous) =>
        previous.filter((message) => message.id !== userMessageId),
      );

      // Restore the user's message for retry.
      setInput(messageText);

      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);

      textareaRef.current?.focus();
    }
  };

  // Enter sends; Shift + Enter inserts a new line.
  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSend(event);
    }
  };

  // Start a new chat.
  const handleNewChat = () => {
    if (isLoading) {
      return;
    }

    setMessages([]);
    setInput("");
    setError("");

    textareaRef.current?.focus();
  };

  // Use a suggested prompt.
  const handleSuggestion = (message) => {
    setInput(message);
    setError("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="z-10 shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="shrink-0 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                DocuMind AI
              </h1>

              <p className="text-xs text-emerald-600">AI Assistant</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />

            <span className="hidden sm:inline">New chat</span>

            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Chat messages */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-3 py-5 sm:px-6 sm:py-8">
          {/* Empty state */}
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Sparkles size={32} />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                How can I help you?
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                Ask me questions, explore ideas, or get help understanding your
                documents. Document-based answers will be available when we
                implement RAG.
              </p>

              {/* Suggested prompts */}
              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSuggestion(
                      "Explain Python Django REST Framework with an example.",
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <Sparkles size={19} className="mb-3 text-indigo-600" />

                  <p className="text-sm font-semibold text-slate-800">
                    Learn a technical concept
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Explain a programming concept with examples.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSuggestion(
                      "Explain how AI and Large Language Models work.",
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <FileText size={19} className="mb-3 text-indigo-600" />

                  <p className="text-sm font-semibold text-slate-800">
                    Explore AI concepts
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Understand LLMs and modern AI technology.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            /* Conversation messages */
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex min-w-0 items-start gap-2 sm:gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      message.role === "user"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {message.role === "user" ? (
                      <UserRound size={18} />
                    ) : (
                      <Bot size={19} />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`min-w-0 max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-indigo-600 text-white"
                        : "rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mt-6 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Bot size={19} />
              </div>

              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <LoaderCircle
                  size={17}
                  className="animate-spin text-indigo-600"
                />

                <span className="text-sm text-slate-500">
                  DocuMind AI is thinking...
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />

              <p className="break-words">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message input */}
      <footer className="shrink-0 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-6 sm:py-5">
          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message DocuMind AI..."
              rows={1}
              maxLength={10000}
              disabled={isLoading}
              aria-label="Type your message"
              className="max-h-36 min-h-11 min-w-0 flex-1 resize-y bg-transparent px-2 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <Send size={19} />
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-[11px] text-slate-400 sm:text-xs">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </footer>
    </div>
  );
}
