import { Bot, User, AlertCircle, RefreshCw, LoaderCircle } from "lucide-react";

export default function ChatMessage({
  message,
  onRetry,
  retryDisabled = false,
}) {
  const isUser = message.role === "user";

  const isPending = message.status === "pending" || message.pending === true;

  const isFailed = message.status === "failed" || message.failed === true;

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

          {/* Pending state */}
          {isPending && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs ${
                isUser ? "text-blue-100" : "text-slate-500"
              }`}
              role="status"
            >
              <LoaderCircle size={13} className="animate-spin" />
              Processing...
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="mt-3 rounded-lg border border-red-200/40 bg-red-50/10 p-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-200">
                <AlertCircle size={14} className="shrink-0" />

                <span>Message failed to process.</span>
              </div>

              {message.error_message && (
                <p className="mt-1 break-words text-xs text-red-100/90">
                  {message.error_message}
                </p>
              )}

              {isUser && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={retryDisabled || !onRetry}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {retryDisabled ? (
                    <LoaderCircle size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Retry
                </button>
              )}
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
