import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getRole } from '../utils/auth';

const CATEGORIES = ['All', 'Product', 'Packaging', 'Trade', 'Other', 'Unknown'];
const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'WITHDRAWN'];

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = ['ticketId', 'text', 'category', 'priority', 'status', 'mobileNumber', 'username', 'createdAt'];
  const escape = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const body = rows.map(r => headers.map(h => escape(h === 'username' ? r.User?.username : r[h])).join(','));
  return [headers.join(','), ...body].join('\n');
};

const download = (filename, content, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const AllComplaints = () => {
  const role = getRole();
  const canDelete = ['QA', 'MANAGER', 'ADMIN'].includes(role);
  const isSuperior = ['MANAGER', 'ADMIN'].includes(role);
  const isQA = role === 'QA';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter(c => {
      if (category !== 'All' && c.category !== category) return false;
      if (priority !== 'All' && c.priority !== priority) return false;
      if (status !== 'All' && c.status !== status) return false;
      if (q) {
        const hay = [c.text, c.ticketId, c.id, c.User?.username, c.category].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [complaints, search, category, priority, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, category, priority, status]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/api/complaints/${id}`, { status: newStatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    }
  };

  const removeComplaint = async (id, ticketId) => {
    const defaultPrompt = isQA
      ? 'Briefly note why this submission does not meet complaint criteria. The customer will receive a polite, polished notification.'
      : `Optional reason for deleting ${ticketId} (the customer will see this).`;
    const reason = window.prompt(defaultPrompt, '');
    if (reason === null) return; // user cancelled
    if (!window.confirm(`Permanently delete ${ticketId}? The customer will be notified${reason ? ' with your reason' : ''}.`)) return;
    try {
      await api.delete(`/api/complaints/${id}`, { data: { reason } });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const exportCsv = () => {
    const csv = toCsv(filtered);
    download(`complaints-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-4xl font-bold text-on-surface tracking-tight mb-2">All Complaints</h2>
          <p className="font-body text-on-surface-variant text-sm">Review, filter, and act on AI-processed complaints.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg font-headline font-semibold text-sm flex items-center gap-2 hover:bg-secondary-container/80 transition-colors">
            <span className="material-symbols-outlined text-lg">download</span>
            Export CSV
          </button>
          {(role === 'CUSTOMER' || role === 'CSE') && (
            <Link to="/submit" className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-lg font-headline font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-primary/20 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>
              New Complaint
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-outline-variant/10">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-lg border-none focus:ring-2 focus:ring-primary/20 font-body text-sm text-on-surface transition-all"
            placeholder="Search by ticket ID, keyword, or customer..."
            type="text"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-4 py-2 bg-surface-container rounded-lg text-sm font-bold border border-outline-variant/15 cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c}>Category: {c}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="px-4 py-2 bg-surface-container rounded-lg text-sm font-bold border border-outline-variant/15 cursor-pointer">
            {PRIORITIES.map(p => <option key={p} value={p}>Priority: {p}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2 bg-surface-container rounded-lg text-sm font-bold border border-outline-variant/15 cursor-pointer">
            {STATUSES.map(s => <option key={s} value={s}>Status: {s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-container-low rounded-lg font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          <div className="col-span-2">ID & Date</div>
          <div className="col-span-3">Overview</div>
          <div className="col-span-2">Category / Customer</div>
          <div className="col-span-2">Priority / Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-outline-variant/30">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-on-surface-variant font-medium">Loading complaints...</p>
          </div>
        ) : pageItems.map((complaint) => (
          <div key={complaint.id} className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-5 md:px-6 bg-white hover:bg-surface-container-low rounded-xl transition-all shadow-sm border border-outline-variant/10">
            <div className="col-span-1 md:col-span-2 flex flex-col">
              <span className="font-headline font-bold text-on-surface text-sm">{complaint.ticketId || `#${complaint.id.substring(0, 8)}`}</span>
              <span className="font-body text-[10px] text-on-surface-variant">{new Date(complaint.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="col-span-1 md:col-span-3 flex flex-col">
              <span className="font-headline font-semibold text-on-surface text-sm line-clamp-1 group-hover:text-primary transition-colors">{complaint.text}</span>
              <span className="font-body text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">{complaint.recommendation}</span>
            </div>
            <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
              <span className="bg-surface-container px-3 py-1 rounded-md text-[10px] font-bold text-on-surface-variant uppercase w-fit">{complaint.category}</span>
              <span className="text-[10px] font-bold text-on-surface-variant">{complaint.User?.username || 'Unknown'}</span>
            </div>
            <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit ${
                complaint.priority === 'High' ? 'bg-error-container text-on-error-container' :
                complaint.priority === 'Medium' ? 'bg-tertiary-container/30 text-on-tertiary-fixed-variant' :
                'bg-secondary-container text-on-secondary-container'
              }`}>
                {complaint.priority}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit ${
                complaint.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' :
                complaint.status === 'ESCALATED' ? 'bg-error text-white' :
                complaint.status === 'WITHDRAWN' ? 'bg-outline-variant/30 text-on-surface-variant line-through' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                {complaint.status}
              </span>
            </div>
            <div className="col-span-1 md:col-span-3 flex justify-end gap-2 items-center flex-wrap">
              {complaint.status !== 'RESOLVED' && complaint.status !== 'WITHDRAWN' && (
                <button
                  onClick={() => updateStatus(complaint.id, 'RESOLVED')}
                  className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase hover:shadow-md transition-all"
                >
                  Resolve
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => removeComplaint(complaint.id, complaint.ticketId)}
                  className="text-error hover:bg-error-container/20 rounded-lg p-1.5"
                  title={isQA ? 'Dismiss as not a valid complaint (notifies customer)' : 'Delete complaint'}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
              <Link to={`/complaints/${complaint.id}`} className="bg-primary/10 text-primary hover:bg-primary-fixed/40 px-4 py-1.5 rounded-lg font-headline font-semibold text-xs transition-colors">
                Details
              </Link>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-outline-variant/30 font-medium text-on-surface-variant">
            No complaints found matching your criteria.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-4 px-2 border-t border-outline-variant/15 mt-4">
        <span className="font-body text-[10px] text-on-surface-variant font-bold uppercase">
          Showing {pageItems.length} of {filtered.length}
        </span>
        <div className="flex gap-2 items-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-30">
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <span className="text-xs font-bold px-2">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-30">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllComplaints;
