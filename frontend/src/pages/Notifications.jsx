import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getRole } from '../utils/auth';

const TYPE_META = {
  UPDATE: { label: 'Update', color: 'bg-primary', textColor: 'text-primary', icon: 'info' },
  STATUS_CHANGE: { label: 'Status Change', color: 'bg-secondary', textColor: 'text-secondary', icon: 'sync_alt' },
  ESCALATION: { label: 'Escalation', color: 'bg-tertiary', textColor: 'text-tertiary', icon: 'trending_up' },
  RESOLUTION: { label: 'Resolved', color: 'bg-secondary', textColor: 'text-secondary', icon: 'check_circle' },
  SYSTEM: { label: 'System', color: 'bg-error', textColor: 'text-error', icon: 'report' }
};

const relativeTime = (iso) => {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Notifications = () => {
  const role = getRole();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = async () => {
    try {
      const res = await api.get('/api/notifications');
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setItems((list) => list.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setItems((list) => list.map(n => ({ ...n, read: true })));
    } catch (e) { console.error(e); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setItems((list) => list.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const visible = items.filter(n => filter === 'all' ? true : !n.read);
  const unreadCount = items.filter(n => !n.read).length;

  const heading = role === 'CUSTOMER' ? 'Your Complaint Updates' : 'Notifications';
  const subtitle = role === 'CUSTOMER'
    ? 'Real-time updates from our support team on your submitted complaints.'
    : 'System alerts and complaint lifecycle updates assigned to you.';

  return (
    <div className="flex-1 p-0 md:p-4 bg-background animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight mb-3">{heading}</h2>
            <p className="font-body text-on-surface-variant text-lg">{subtitle}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className="bg-surface-container text-on-surface font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors"
            >
              {filter === 'all' ? `Show Unread (${unreadCount})` : 'Show All'}
            </button>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              Mark All Read
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-outline-variant/30">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-on-surface-variant font-medium">Loading notifications...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">notifications_off</span>
            <p className="text-on-surface-variant font-medium mt-2">
              {filter === 'unread' ? 'No unread notifications.' : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.UPDATE;
              return (
                <div
                  key={n.id}
                  className={`bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden group transition-all ${n.read ? 'opacity-75' : ''}`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${meta.color}`}></div>
                  <div className="flex items-start gap-5">
                    <div className={`w-10 h-10 rounded-xl ${meta.color}/10 flex items-center justify-center ${meta.textColor} shrink-0`}>
                      <span className="material-symbols-outlined icon-fill">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${meta.textColor} bg-surface-container-low`}>
                          {meta.label}
                        </span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase ml-auto">{relativeTime(n.createdAt)}</span>
                      </div>
                      <h4 className="font-headline font-bold text-on-surface text-base mb-1">{n.title}</h4>
                      <p className="font-body text-sm text-on-surface-variant leading-relaxed">{n.message}</p>
                      {n.complaint && (
                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-black text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">tag</span>
                            {n.complaint.ticketId}
                          </span>
                          <span className="text-[10px] font-black px-2 py-1 rounded-md uppercase bg-surface-container-low text-on-surface-variant">
                            {n.complaint.category}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                            n.complaint.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {n.complaint.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 justify-end">
                    {n.complaintId && (
                      <Link
                        onClick={() => !n.read && markRead(n.id)}
                        to={`/complaints/${n.complaintId}`}
                        className="text-[10px] font-black uppercase text-primary hover:underline"
                      >
                        View Complaint →
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-[10px] font-black uppercase text-on-surface-variant hover:text-primary">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => remove(n.id)} className="text-[10px] font-black uppercase text-on-surface-variant hover:text-error">
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
