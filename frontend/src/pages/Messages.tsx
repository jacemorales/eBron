import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ExternalLink } from 'lucide-react';
import type { Conversation, Message } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Messages: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  const fetchConvs = async () => {
    if (!user) return;
    const list = await api.getConversations(user.userId);
    setConversations(list);
    if (!activeConvId && list.length > 0) setSearchParams({ conv: list[0].conversationId });
  };

  const fetchMsgs = async (id: string) => {
    if (!user) return;
    const res = await api.getMessages(id, user.userId);
    if (res.success && res.messages) setMessages(res.messages);
  };

  useEffect(() => { fetchConvs(); }, [user]);
  useEffect(() => { if (activeConvId) fetchMsgs(activeConvId); }, [activeConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || !user) return;
    const res = await api.sendMessage(activeConvId, user.userId, inputText);
    if (res.success && res.message) {
      setInputText('');
      setMessages(prev => [...prev, res.message!]);
      fetchConvs();
    }
  };

  const activeConv = conversations.find(c => c.conversationId === activeConvId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[650px]">
        <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-4 border-b bg-white font-bold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cu-blue" /> Conversations
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No chats yet.</div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.conversationId}
                  onClick={() => setSearchParams({ conv: c.conversationId })}
                  className={`w-full p-3 text-left flex gap-3 text-xs ${c.conversationId === activeConvId ? 'bg-blue-50 border-l-4 border-cu-blue' : 'hover:bg-slate-100'}`}
                >
                  <img src={c.productImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{c.buyerId === user?.userId ? c.sellerName : c.buyerName}</div>
                    <div className="text-[11px] text-cu-blue truncate">{c.productName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{c.lastMessageSnippet}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white">
          {activeConv ? (
            <>
              <div className="p-3 border-b flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <img src={activeConv.productImage} alt="" className="w-8 h-8 rounded object-cover" />
                  <span className="font-bold">{activeConv.productName}</span>
                </div>
                <button onClick={() => navigate(`/product/${activeConv.productId}`)} className="text-cu-blue font-bold flex items-center gap-1">
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-slate-50/50">
                {messages.map(m => {
                  const mine = m.senderId === user?.userId;
                  return (
                    <div key={m.messageId} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div className={`p-2.5 rounded-2xl text-xs max-w-sm ${mine ? 'bg-cu-blue text-white' : 'bg-white border text-slate-800'}`}>
                        {m.content}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-xl text-xs"
                />
                <button type="submit" className="p-2 bg-cu-blue text-white rounded-xl">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">Select a chat</div>
          )}
        </div>
      </div>
    </div>
  );
};
