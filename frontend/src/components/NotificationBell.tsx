import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, ShieldAlert, ShoppingBag, Store, MessageSquare, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { NotificationItem } from '../types';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const list = await api.getNotifications(user.userId);
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Polling every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleOpenNotif = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await api.markNotificationRead(notif.notificationId);
      setNotifications(prev =>
        prev.map(n => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    navigate(notif.destinationUrl || '/');
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await api.markAllNotificationsRead(user.userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case 'order':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />;
      case 'wallet':
        return <DollarSign className="w-3.5 h-3.5 text-cu-gold" />;
      case 'sales':
        return <Store className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifs();
        }}
        className="relative p-2 rounded-xl text-slate-200 hover:text-white hover:bg-cu-dark transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl text-slate-800 py-2 z-50 border border-slate-100 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
            <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-cu-blue hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                You have no notifications yet.
              </div>
            ) : (
              notifications.slice(0, 25).map(notif => (
                <div
                  key={notif.notificationId}
                  onClick={() => handleOpenNotif(notif)}
                  className={`p-3.5 text-xs cursor-pointer transition hover:bg-slate-50 flex items-start gap-3 ${
                    !notif.isRead ? 'bg-blue-50/40 font-semibold' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-slate-900 truncate">{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cu-blue flex-shrink-0 mt-1"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
