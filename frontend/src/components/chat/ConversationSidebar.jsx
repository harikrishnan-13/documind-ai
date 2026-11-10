import {
  MessageSquare,
  Plus,
  PanelLeftClose,
  Bot,
  Archive,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ConversationItem({
  conversation,
  isSelected,
  isArchived = false,
  isBusy = false,
  isDisabled = false,
  onSelect,
  onArchive,
  onRestore,
  onDelete,
}) {
  const title = conversation.title || "New conversation";

  return (
    <div
      className={`group flex min-w-0 items-center gap-1 rounded-lg px-2 py-2 transition ${
        isSelected
          ? "bg-slate-700 text-white"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        disabled={isDisabled || isBusy}
        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
        title={title}
      >
        <MessageSquare size={16} className="shrink-0" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{title}</span>

          <span className="block text-xs text-slate-400">
            {formatDate(conversation.updated_at || conversation.created_at)}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        {isBusy ? (
          <LoaderCircle
            size={16}
            className="animate-spin text-slate-400"
            aria-label="Processing conversation"
          />
        ) : (
          <>
            {isArchived ? (
              <button
                type="button"
                onClick={() => onRestore(conversation.id)}
                disabled={isDisabled}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-600 hover:text-white disabled:opacity-40"
                title="Restore conversation"
                aria-label={`Restore ${title}`}
              >
                <RotateCcw size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onArchive(conversation.id)}
                disabled={isDisabled}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-600 hover:text-white disabled:opacity-40"
                title="Archive conversation"
                aria-label={`Archive ${title}`}
              >
                <Archive size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(conversation)}
              disabled={isDisabled}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40"
              title="Delete conversation"
              aria-label={`Delete ${title}`}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConversationSidebar({
  conversations = [],
  archivedConversations = [],
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  onArchiveConversation,
  onRestoreConversation,
  onDeleteConversation,
  isLoading = false,
  isDisabled = false,
  isManagingConversationId = null,
  collapsed = false,
  onClose,
  onToggleCollapse,
  mobile = false,
  showArchived = false,
  onToggleArchived,
}) {
  if (collapsed && !mobile) {
    return (
      <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-950 py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftClose size={20} />
        </button>

        <button
          type="button"
          onClick={onNewChat}
          disabled={isDisabled}
          className="mt-6 rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-500 disabled:opacity-50"
          title="New chat"
          aria-label="New chat"
        >
          <Plus size={20} />
        </button>

        <div className="mt-5">
          <Bot size={22} className="text-blue-400" />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`flex h-full min-w-0 flex-col border-r border-slate-800 bg-slate-950 text-white ${
        mobile ? "w-full max-w-[320px]" : "w-72 shrink-0"
      }`}
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-lg bg-blue-600 p-2">
            <Bot size={19} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">DocuMind AI</h2>
            <p className="text-xs text-slate-400">Document Assistant</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!mobile && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}

          {mobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X size={19} />
            </button>
          )}
        </div>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          New Chat
        </button>
      </div>

      {/* Conversation lists */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
        {/* Active conversations heading */}
        <button
          type="button"
          onClick={() => onToggleArchived?.(false)}
          className={`mb-2 flex items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            !showArchived ? "text-blue-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Recent conversations</span>

          {!showArchived && <ChevronDown size={15} />}
        </button>

        {/* Active conversations */}
        {!showArchived && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <LoaderCircle size={17} className="animate-spin" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">
                No conversations yet.
                <br />
                Start a new chat.
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    isBusy={isManagingConversationId === conversation.id}
                    isDisabled={isDisabled}
                    onSelect={onSelectConversation}
                    onArchive={onArchiveConversation}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Archived conversations heading */}
        <button
          type="button"
          onClick={() => onToggleArchived?.(!showArchived)}
          className={`mt-5 flex items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            showArchived ? "text-blue-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Archived conversations</span>

          {showArchived ? (
            <ChevronDown size={15} />
          ) : (
            <ChevronRight size={15} />
          )}
        </button>

        {/* Archived conversations */}
        {showArchived && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <LoaderCircle size={17} className="animate-spin" />
                Loading archived chats...
              </div>
            ) : archivedConversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">
                No archived conversations.
              </p>
            ) : (
              <div className="space-y-1">
                {archivedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    isArchived
                    isBusy={isManagingConversationId === conversation.id}
                    isDisabled={isDisabled}
                    onSelect={onSelectConversation}
                    onRestore={onRestoreConversation}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar footer */}
      <div className="border-t border-slate-800 p-3">
        <p className="text-center text-xs text-slate-500">
          DocuMind AI · Intelligent Document Assistant
        </p>
      </div>
    </aside>
  );
}
