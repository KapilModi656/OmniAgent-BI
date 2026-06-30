import {useCallback, useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {Chats, CurrentChat, isSidebarOpenAtom, type ChatItem} from '../store/store';
import {API_BASE, getAuthHeaders} from '../utils';

const BASE_CHAT_NAME = 'New Chat';

function getUniqueChatName(chats: ChatItem[]) {
  const existingNames = new Set(chats.map((chat) => chat.name));
  if (!existingNames.has(BASE_CHAT_NAME)) {
    return BASE_CHAT_NAME;
  }

  let index = 1;
  while (existingNames.has(`${BASE_CHAT_NAME} ${index}`)) {
    index += 1;
  }

  return `${BASE_CHAT_NAME} ${index}`;
}

function ActionButton({
  label,
  onClick,
  title,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none"
    >
      <span className="text-sm leading-none">{label}</span>
    </button>
  );
}

export default function Sidebar() {
  const [chats, setChats] = useAtom(Chats);
  const [currentChat, setCurrentChat] = useAtom(CurrentChat);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const sortedChats = [...chats].sort((a, b) => b.id - a.id);

  function normalizeChats(payload: unknown): ChatItem[] {
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { chats?: unknown[] }).chats)
        ? (payload as { chats: unknown[] }).chats
        : payload && typeof payload === 'object' && (payload as { chat?: unknown }).chat
          ? [(payload as { chat: unknown }).chat]
          : [];

    return rawList
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => {
        const idValue = typeof item.id === 'number' ? item.id : Number(item.chatId ?? item.id ?? 0);
        return {
          id: Number.isFinite(idValue) ? idValue : 0,
          name: String(item.name ?? `Chat ${idValue}`),
          pipelineUrl: item.pipelineUrl ? String(item.pipelineUrl) : null,
          trainingUrl: item.trainingUrl ? String(item.trainingUrl) : null,
          modelMetrics: item.modelMetrics ? String(item.modelMetrics) : null,
        } satisfies ChatItem;
      })
      .filter((chat) => chat.id > 0);
  }

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chats/list`, {
        method: 'GET',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      
      const parsed = normalizeChats(data);
      setChats(parsed);
      
      setCurrentChat((prevCurrentChat) => {
        if (parsed.length === 0) return null;
        if (!parsed.some((chat) => chat.id === prevCurrentChat)) {
          // By default select the newest chat (first in sorted list)
          const newestChat = [...parsed].sort((a, b) => b.id - a.id)[0];
          return newestChat.id;
        }
        return prevCurrentChat;
      });
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, [setChats, setCurrentChat]);
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (isCreatingChat) {
      createInputRef.current?.focus();
    }
  }, [isCreatingChat]);

  useEffect(() => {
    if (editingChatId) {
      editInputRef.current?.focus();
    }
  }, [editingChatId]);

  async function createChat() {
    const trimmedName = newChatName.trim();
    const chatName = trimmedName || getUniqueChatName(sortedChats);
    
    // Optimistic UI update
    const tempId = Date.now();
    const tempChat: ChatItem = { id: tempId, name: chatName, pipelineUrl: null, trainingUrl: null };
    setChats((prev) => [...prev, tempChat]);
    setCurrentChat(tempId);
    
    setIsCreatingChat(false);
    setNewChatName('');

    try {
      const res = await fetch(`${API_BASE}/chats/create`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: chatName }),
      });
      const data = await res.json();
      if (data && typeof data === 'object') {
        const createdId = Number((data as { chatId?: number }).chatId ?? 0);
        if (createdId > 0) {
          // Replace temp chat with real chat
          setChats((prev) => prev.map(c => c.id === tempId ? { ...c, id: createdId } : c));
          setCurrentChat(createdId);
        }
      }
      await fetchChats(); // Sync in background
    } catch (error) {
      console.error('Error creating new chat:', error);
      // Revert optimistic update
      setChats((prev) => prev.filter(c => c.id !== tempId));
    }
  }

  async function deleteChat(chatId: string) {
    const numericId = Number(chatId);
    // Optimistic UI update
    setChats((prev) => prev.filter(c => c.id !== numericId));
    if (currentChat === numericId) {
      const remaining = sortedChats.filter(c => c.id !== numericId);
      setCurrentChat(remaining.length > 0 ? remaining[0].id : null);
    }

    try {
      await fetch(`${API_BASE}/chats/delete`, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: numericId }),
      });
      await fetchChats(); // Sync in background
    } catch (error) {
      console.error('Error deleting chat:', error);
      await fetchChats(); // Revert on error
    }
  }

  async function renameChat(chatId: string, newName: string) {
    const numericId = Number(chatId);
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setEditingChatId(null);
      setEditingChatName('');
      return;
    }

    // Optimistic UI update
    setChats((prev) => prev.map(c => c.id === numericId ? { ...c, name: trimmedName } : c));
    setEditingChatId(null);
    setEditingChatName('');

    try {
      await fetch(`${API_BASE}/chats/rename`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: numericId, newName: trimmedName }),
      });
      await fetchChats(); // Sync in background
    } catch (error) {
      console.error('Error renaming chat:', error);
      await fetchChats(); // Revert on error
    }
  }

  function startCreatingChat() {
    setEditingChatId(null);
    setIsCreatingChat(true);
    setNewChatName('');
  }

  function startEditingChat(chat: ChatItem) {
    setIsCreatingChat(false);
    setEditingChatId(String(chat.id));
    setEditingChatName(chat.name);
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card text-foreground shadow-xl transition-transform duration-300 md:static md:shadow-sm md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">Chats</h2>
          <button
            type="button"
            onClick={startCreatingChat}
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition hover:opacity-90 shadow-sm"
          >
            + Create
          </button>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {isCreatingChat && (
          <li className="mb-2 rounded-lg border border-primary/60 bg-muted shadow-sm px-3 py-2 transition-all">
            <input
              ref={createInputRef}
              value={newChatName}
              onChange={(event) => setNewChatName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void createChat();
                }
                if (event.key === 'Escape') {
                  setIsCreatingChat(false);
                  setNewChatName('');
                }
              }}
              onBlur={() => {
                if (newChatName.trim()) {
                  void createChat();
                } else {
                  setIsCreatingChat(false);
                }
              }}
              placeholder="Chat name..."
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            />
          </li>
        )}

        {sortedChats.map((chat) => {
          const isEditing = editingChatId === String(chat.id);
          const isActive = currentChat === chat.id;

          return (
            <li
              key={chat.id}
              className={`group mb-2 rounded-lg border px-3 py-2 transition-all cursor-pointer ${isActive ? 'border-primary/60 bg-muted shadow-sm' : 'border-transparent hover:border-border hover:bg-muted/50'}`}
              onClick={() => setCurrentChat(chat.id)}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editingChatName}
                  onChange={(event) => setEditingChatName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void renameChat(String(chat.id), editingChatName);
                    }
                    if (event.key === 'Escape') {
                      setEditingChatId(null);
                      setEditingChatName('');
                    }
                  }}
                  onBlur={() => void renameChat(String(chat.id), editingChatName)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground font-medium">{chat.name}</span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <ActionButton label="✎" title="Rename chat" onClick={(e) => { e.stopPropagation(); startEditingChat(chat); }} />
                    <ActionButton label="🗑" title="Delete chat" onClick={(e) => { e.stopPropagation(); void deleteChat(String(chat.id)); }} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}