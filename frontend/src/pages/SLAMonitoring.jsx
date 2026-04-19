import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const formatHours = (h) => {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = ['ticketId', 'category', 'priority', 'status', 'elapsedHours', 'limitHours', 'deadline', 'violated'];
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
};

const SLAMonitoring = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [onlyBreach, setOnlyBreach] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/sla');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => complaints.filter(c => {
    if (onlyBreach && !c.violated) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && c.priority !== priorityFilter) return false;
    return true;
  }), [complaints, statusFilter, priorityFilter, onlyBreach]);

  const violatedCount = complaints.filter(c => c.violated).length;
  const openCount = complaints.filter(c => c.status !== 'RESOLVED').length;
  const avgElapsed = openCount
    ? (complaints.filter(c => c.status !== 'RESOLVED').reduce((a, b) => a + b.elapsedHours, 0) / openCount).toFixed(1)
    : 0;

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-12 animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="font-headline text-4xl md:text-5xl leading-tight font-extrabold text-on-surface mb-2 tracking-tight">SLA Monitoring</h1>
        <p className="font-body text-lg text-on-surface-variant max-w-2xl">Real-time overview of complaint resolution times against Service Level Agreements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10 border-l-4 border-secondary">
          <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Open Cases</p>
          <div className="flex items-end gap-3">
            <span className="font-headline text-5xl font-black text-on-surface tracking-tighter">{openCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10">
          <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Avg Elapsed (open)</p>
          <div className="flex items-end gap-3">
            <span className="font-headline text-5xl font-black text-on-surface tracking-tighter">{avgElapsed}</span>
            <span className="font-body text-sm font-bold text-on-surface-variant mb-1 uppercase">Hours</span>
          </div>
        </div>

        <div className="bg-error-container/20 rounded-xl p-6 shadow-sm border-l-4 border-error border border-outline-variant/10">
          <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-error-container mb-2 opacity-80">SLA Violations</p>
          <div className="flex items-end gap-3">
            <span className="font-headline text-5xl font-black text-on-error-container tracking-tighter">{violatedCount}</span>
            {violatedCount > 0 && <span className="font-body text-xs text-on-error-container font-black mb-1 flex items-center bg-error/10 px-2 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px] mr-1">warning</span> Action Required
            </span>}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 gap-4 bg-white rounded-xl mb-6 shadow-sm border border-outline-variant/5">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-surface-container text-on-surface font-bold text-[10px] uppercase px-4 py-2 rounded-full border border-outline-variant/10 cursor-pointer">
              <option value="All">Priority: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-surface-container text-on-surface font-bold text-[10px] uppercase px-4 py-2 rounded-full border border-outline-variant/10 cursor-pointer">
              <option value="All">Status: Any</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant tracking-widest">
              <input type="checkbox" checked={onlyBreach} onChange={e => setOnlyBreach(e.target.checked)} />
              Breaches Only
            </label>
          </div>
          <button onClick={exportCsv} className="bg-primary text-white font-label text-[10px] font-black uppercase px-6 py-2 rounded-lg shadow-lg shadow-primary/20">
            Export Report
          </button>
        </div>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant/10">
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Ticket</th>
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Elapsed</th>
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Limit</th>
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Priority</th>
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="py-4 px-6 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm divide-y divide-outline-variant/5">
                {loading ? (
                  <tr><td colSpan="6" className="py-10 text-center text-on-surface-variant font-medium">Monitoring feed...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="py-10 text-center text-on-surface-variant font-medium italic">No cases match the filters.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className={`hover:bg-surface-container-low transition-colors ${c.violated ? 'bg-error-container/5' : ''}`}>
                    <td className="py-4 px-6 font-headline font-bold text-on-surface">{c.ticketId}</td>
                    <td className="py-4 px-6 text-on-surface font-medium">{formatHours(c.elapsedHours)}</td>
                    <td className="py-4 px-6 text-on-surface-variant font-bold">{formatHours(c.limitHours)}</td>
                    <td className="py-4 px-6 text-on-surface-variant font-medium">{c.priority}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        c.violated ? 'bg-error text-white' : c.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {c.violated ? 'Violated' : c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link to={`/complaints/${c.id}`} className="text-primary font-black text-[10px] uppercase hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SLAMonitoring;
