import { Bot, User, AlertCircle, RefreshCw, LoaderCircle } from "lucide-react";

export default function ChatMessage({ message, onRetry }) {
  const isUser = message.role === "user";

  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`flex w-full gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Bot size={19} />
        </div>
      )}

      <div
        className={`max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] ${
          isUser ? "order-first" : ""
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {message.content}
          </p>

          {message.pending && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs ${
                isUser ? "text-blue-100" : "text-slate-500"
              }`}
            >
              <LoaderCircle size={13} className="animate-spin" />
              Sending...
            </div>
          )}

          {message.failed && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-red-600">
              <AlertCircle size={14} />
              <span>Message failed to send.</span>

              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          )}
        </div>

        <p
          className={`mt-1 text-[11px] text-slate-400 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {isUser ? "You" : "DocuMind AI"}
          {time ? ` · ${time}` : ""}
        </p>
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
          <User size={18} />
        </div>
      )}
    </div>
  );
}
