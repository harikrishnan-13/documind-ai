import { MessageSquare, Plus, PanelLeftClose, Bot } from "lucide-react";

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export default function ConversationSidebar({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  isLoading = false,
  isDisabled = false,
  collapsed = false,
  onClose,
  onToggleCollapse,
}) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      {/* Sidebar header */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-800 ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <Bot size={21} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold">DocuMind AI</h2>
              <p className="text-xs text-slate-400">Document Assistant</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={19} />
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* New conversation */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isDisabled}
          title="New chat"
          className={`flex w-full items-center gap-3 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Plus size={19} />

          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Conversation history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {!collapsed && (
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recent conversations
          </p>
        )}

        {isLoading && (
          <div className="space-y-3 px-2 py-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-10 animate-pulse rounded-lg bg-slate-800"
              />
            ))}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-slate-500">
            {collapsed ? "" : "No conversations yet."}
          </p>
        )}

        {!isLoading &&
          conversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;

            return (
              <button
                key={conversation.id}
                type="button"
                disabled={isDisabled}
                onClick={() => onSelectConversation(conversation.id)}
                title={conversation.title}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-900"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <MessageSquare size={17} className="shrink-0" />

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {conversation.title || "New conversation"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(conversation.updated_at)}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Sidebar footer */}
      <div className="shrink-0 border-t border-slate-800 p-4">
        {!collapsed && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AI Assistant
          </div>
        )}
      </div>
    </aside>
  );
}
