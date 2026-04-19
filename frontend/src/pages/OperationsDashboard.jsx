import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3525cd', '#006b5f', '#7e3000', '#ba1a1a', '#4f46e5', '#71f8e4'];

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = ['ticketId', 'text', 'category', 'priority', 'status', 'mobileNumber', 'createdAt', 'resolutionTime'];
  const escape = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const body = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headers.join(','), ...body].join('\n');
};

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const relativeTime = (iso) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const OperationsDashboard = () => {
  const [metrics, setMetrics] = useState({ total: 0, resolved: 0, pending: 0, slaViolations: 0, categories: {}, priorities: {}, trend: [], avgResolutionHours: 0 });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, c] = await Promise.all([
          api.get('/api/analytics'),
          api.get('/api/complaints')
        ]);
        setMetrics(m.data);
        setComplaints(c.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const pieData = useMemo(() => Object.keys(metrics.categories || {}).map(cat => ({ name: cat, value: metrics.categories[cat] })), [metrics.categories]);
  const trendData = metrics.trend?.length ? metrics.trend : [];

  const liveFeed = useMemo(() => {
    return complaints.slice(0, 4).map(c => ({
      id: c.id,
      ticketId: c.ticketId,
      badge: c.priority === 'High' ? 'Critical Risk' : c.status === 'ESCALATED' ? 'Escalated' : 'Open Case',
      badgeClass: c.priority === 'High' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container',
      title: c.text.length > 60 ? c.text.slice(0, 60) + '...' : c.text,
      category: c.category,
      username: c.User?.username || 'Unknown',
      when: relativeTime(c.createdAt)
    }));
  }, [complaints]);

  const exportAll = () => {
    downloadCsv(`operations-intel-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(complaints));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-4xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">Operational Intel</h2>
          <p className="text-lg font-body text-on-surface-variant mt-2 max-w-xl leading-relaxed font-medium">Real-time intelligence on customer friction points and system health.</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-on-surface-variant flex items-center gap-2 pl-4 pr-2 tracking-widest opacity-60">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#006b5f]"></span>
            System Live
          </span>
          <button onClick={exportAll} className="bg-primary text-white font-headline font-bold py-3 px-6 rounded-xl text-sm hover:opacity-90 transition-all shadow-[0_8px_24px_rgba(53,37,205,0.2)]">
            Download Intel
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0px_16px_48px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 opacity-70">Total Volume</p>
              <h3 className="text-6xl font-headline font-black text-on-surface tracking-tighter mb-4">{metrics.total}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-secondary tracking-widest">
                {metrics.resolved} resolved
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] relative shadow-[0px_16px_48px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 opacity-70 flex items-center gap-2">
                SLA Breaches
                <span className="material-symbols-outlined text-error text-[16px] icon-fill">warning</span>
              </p>
              <h3 className="text-6xl font-headline font-black text-on-surface tracking-tighter mb-4">{metrics.slaViolations}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-error tracking-widest">
                Requires attention
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] relative shadow-[0px_16px_48px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 opacity-70">Avg Resolution</p>
              <h3 className="text-6xl font-headline font-black text-on-surface tracking-tighter mb-4">{metrics.avgResolutionHours || 0}<span className="text-2xl font-bold ml-1">h</span></h3>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-secondary tracking-widest">
                Across resolved
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-primary-container text-white p-8 rounded-[2.5rem] shadow-2xl shadow-primary/30 relative overflow-hidden">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4">Open / Pending</p>
              <h3 className="text-6xl font-headline font-black text-white tracking-tighter mb-4">{metrics.pending}</h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mt-6 bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                Active Queue
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col h-[400px]">
              <h4 className="font-headline font-bold text-lg text-on-surface mb-6">Category Breakdown</h4>
              <div className="flex-1">
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-on-surface-variant italic">No complaints yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border-l-4 border-secondary border border-outline-variant/10 shadow-sm relative overflow-hidden flex flex-col h-[400px]">
              <h4 className="font-headline font-bold text-lg text-on-surface mb-6">7-Day Volume Trend</h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="count" fill="#3525cd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[400px] bg-surface-container-low rounded-[3rem] p-10 flex flex-col h-auto lg:h-[calc(100vh-14rem)] lg:sticky lg:top-8">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter">Live Intel</h3>
            <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Active</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
            {liveFeed.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">No incoming complaints.</p>
            ) : liveFeed.map(item => (
              <Link to={`/complaints/${item.id}`} key={item.id} className="block bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_8px_24px_rgba(15,23,42,0.04)] hover:shadow-[0px_16px_48px_rgba(15,23,42,0.08)] transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${item.badgeClass}`}>{item.badge}</span>
                  <span className="text-[10px] text-on-surface-variant font-bold opacity-60">{item.when}</span>
                </div>
                <h4 className="font-headline font-bold text-base text-on-surface mb-2">{item.title}</h4>
                <div className="flex items-center gap-2 mt-3 text-[10px] font-black text-on-surface-variant uppercase">
                  <span>{item.category}</span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                  <span>{item.username}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-sm text-on-surface-variant italic mt-6">Hydrating data...</p>}
    </div>
  );
};

export default OperationsDashboard;
