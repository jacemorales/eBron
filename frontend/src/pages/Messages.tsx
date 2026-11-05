import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ExternalLink, CheckCheck } from 'lucide-react';
import type { Conversation, Message } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Messages: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get('conv') || searchParams.get('conversationId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const fetchConvs = async () => {
    if (!user) return;
    try {
      const list = await api.getConversations(user.userId);
      setConversations(list);
      if (!activeConvId && list.length > 0) {
        setSearchParams({ conv: list[0].conversationId });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMsgs = async (id: string) => {
    if (!user) return;
    setLoadingMsgs(true);
    try {
      const res = await api.getMessages(id, user.userId);
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
      // Explicitly mark conversation messages as read on the backend
      await api.markConversationAsRead(id, user.userId);
      // Immediately reset local unread count for this conversation
      setConversations(prev =>
        prev.map(c => (c.conversationId === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (activeConvId) {
      fetchMsgs(activeConvId);
      const msgInterval = setInterval(() => {
        if (activeConvId) fetchMsgs(activeConvId);
      }, 5000);
      return () => clearInterval(msgInterval);
    }
  }, [activeConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || !user) return;
    const content = inputText.trim();
    setInputText('');

    const res = await api.sendMessage(activeConvId, user.userId, content);
    if (res.success && res.message) {
      setMessages(prev => [...prev, res.message!]);
      fetchConvs();
    } else {
      onToast('error', res.error || 'Failed to send message.');
    }
  };

  const activeConv = conversations.find(c => c.conversationId === activeConvId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[650px] shadow-sm">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-4 border-b bg-white font-bold text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cu-blue" />
              <span>Conversations</span>
            </div>
            {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse">
                {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} new
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active chat conversations. Start a chat from any product details page!
              </div>
            ) : (
              conversations.map(c => {
                const isSelected = c.conversationId === activeConvId;
                const unread = Number(c.unreadCount) || 0;
                return (
                  <button
                    key={c.conversationId}
                    onClick={() => setSearchParams({ conv: c.conversationId })}
                    className={`w-full p-3.5 text-left flex gap-3 text-xs transition relative ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-cu-blue'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <img
                      src={c.productImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover bg-white border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <span className={`truncate font-bold text-slate-900 ${unread > 0 ? 'text-cu-blue' : ''}`}>
                          {c.buyerId === user?.userId ? c.sellerName : c.buyerName}
                        </span>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-500 text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                        {c.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.lastMessageSnippet}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b flex justify-between items-center text-xs bg-slate-50/40">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConv.productImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'}
                    alt=""
                    className="w-9 h-9 rounded-xl object-cover border"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900">{activeConv.productName}</span>
                    <div className="text-[11px] text-slate-500">
                      {activeConv.buyerId === user?.userId ? `Seller: ${activeConv.sellerName}` : `Buyer: ${activeConv.buyerName}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/product/${activeConv.productId}`)}
                  className="px-3 py-1.5 rounded-xl bg-cu-blue/10 text-cu-blue hover:bg-cu-blue hover:text-white font-bold flex items-center gap-1 transition"
                >
                  View Product <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages scroll area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/50">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">Loading conversation...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No messages in this conversation yet. Say hello!
                  </div>
                ) : (
                  messages.map(m => {
                    const mine = m.senderId === user?.userId;
                    return (
                      <div key={m.messageId} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3 rounded-2xl text-xs max-w-sm shadow-sm ${
                            mine
                              ? 'bg-cu-blue text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                          }`}
                        >
                          {m.content}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1">
                          <span>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                          {mine && (
                            <CheckCheck className={`w-3 h-3 ${m.isRead ? 'text-blue-500' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message to the student..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cu-blue"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 bg-cu-blue hover:bg-cu-dark disabled:opacity-40 text-white rounded-2xl font-bold text-xs shadow flex items-center gap-1 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <span>Select a conversation from the left to start chatting</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
