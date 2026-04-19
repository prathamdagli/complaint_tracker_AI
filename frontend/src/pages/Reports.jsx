import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
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

const buildHtmlReport = (title, summary, rows) => {
  const style = `
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { color: #3525cd; border-bottom: 3px solid #3525cd; padding-bottom: 12px; }
    h2 { color: #334; margin-top: 28px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #e5eeff; text-align: left; padding: 8px; border: 1px solid #ddd; }
    td { padding: 8px; border: 1px solid #eee; vertical-align: top; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    .kpi { display:inline-block; background:#f5f7ff; padding:12px 20px; margin-right:12px; border-radius:8px; }
    .kpi strong { display:block; font-size: 22px; color:#3525cd; }
  `;
  const kpis = Object.entries(summary).map(([k, v]) => `<div class="kpi"><strong>${v}</strong><span>${k}</span></div>`).join('');
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const table = rows.length
    ? `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${headers.map(h => `<td>${(r[h] ?? '').toString().replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p><em>No records.</em></p>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body>
    <h1>${title}</h1>
    <div class="meta">Generated ${new Date().toLocaleString()} · ComplainTracker AI</div>
    <div>${kpis}</div>
    <h2>Complaint Records (${rows.length})</h2>
    ${table}
    <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
  </body></html>`;
};

const Reports = () => {
  const [complaints, setComplaints] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a] = await Promise.all([
          api.get('/api/complaints'),
          api.get('/api/analytics')
        ]);
        setComplaints(c.data);
        setMetrics(a.data);
        try {
          setHistory(JSON.parse(localStorage.getItem('report_history') || '[]'));
        } catch { setHistory([]); }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recordHistory = (entry) => {
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem('report_history', JSON.stringify(next));
  };

  const flattenRows = (rows) => rows.map(c => ({
    ticketId: c.ticketId,
    createdAt: new Date(c.createdAt).toLocaleString(),
    category: c.category,
    priority: c.priority,
    status: c.status,
    customer: c.User?.username || 'Unknown',
    mobile: c.mobileNumber || '',
    text: c.text,
    recommendation: c.recommendation,
    resolutionHours: c.resolutionTime || ''
  }));

  const exportCsv = () => {
    const rows = flattenRows(complaints);
    const name = `complaints-full-${new Date().toISOString().slice(0, 10)}.csv`;
    download(name, toCsv(rows), 'text/csv;charset=utf-8;');
    recordHistory({ title: 'Full Complaint Export (CSV)', type: 'CSV', date: new Date().toISOString(), count: rows.length });
  };

  const exportPdf = () => {
    const rows = flattenRows(complaints);
    const summary = {
      'Total': metrics.total || rows.length,
      'Resolved': metrics.resolved || 0,
      'Pending': metrics.pending || 0,
      'SLA Breaches': metrics.slaViolations || 0
    };
    const html = buildHtmlReport('Complaint Resolution Report', summary, rows);
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups to print the report.');
      return;
    }
    win.document.write(html);
    win.document.close();
    recordHistory({ title: 'Complaint Resolution Report (PDF)', type: 'PDF', date: new Date().toISOString(), count: rows.length });
  };

  const exportSlaCsv = () => {
    const breach = complaints.filter(c => c.priority === 'High' && c.status !== 'RESOLVED');
    download(`sla-breaches-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(flattenRows(breach)), 'text/csv;charset=utf-8;');
    recordHistory({ title: 'SLA Breach Root Cause (CSV)', type: 'CSV', date: new Date().toISOString(), count: breach.length });
  };

  const exportCategoryCsv = () => {
    const cats = Object.entries(metrics.categories || {}).map(([name, value]) => ({ category: name, count: value }));
    download(`category-summary-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(cats), 'text/csv;charset=utf-8;');
    recordHistory({ title: 'Category Distribution (CSV)', type: 'CSV', date: new Date().toISOString(), count: cats.length });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('report_history');
  };

  return (
    <div className="flex-1 p-0 md:p-4 bg-background animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-on-surface">Reports</h1>
            <p className="text-on-surface-variant text-base mt-2 max-w-2xl font-medium">Generate and download comprehensive performance data and AI insights.</p>
          </div>
          <button
            onClick={exportPdf}
            disabled={loading}
            className="bg-primary text-white px-8 py-3 rounded-xl font-headline font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">add_chart</span>
            Generate Full Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button onClick={exportPdf} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-on-surface">PDF Export</h3>
            <p className="text-[10px] font-bold text-on-surface-variant">Opens print-ready view</p>
          </button>
          <button onClick={exportCsv} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-3xl">table_view</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-on-surface">CSV Data</h3>
            <p className="text-[10px] font-bold text-on-surface-variant">All complaint records</p>
          </button>
          <button onClick={exportSlaCsv} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-error-container/50 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-on-surface">SLA Breach Report</h3>
            <p className="text-[10px] font-bold text-on-surface-variant">High-priority, unresolved</p>
          </button>
          <button onClick={exportCategoryCsv} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl">auto_graph</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-on-surface">Category Summary</h3>
            <p className="text-[10px] font-bold text-on-surface-variant">Distribution breakdown</p>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-bold text-xl text-on-surface">Recent Generation History</h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-[10px] font-black uppercase text-on-surface-variant hover:text-error">
                Clear history
              </button>
            )}
          </div>
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic text-center py-8">No reports generated yet. Use an export action above to get started.</p>
            ) : history.map((report, idx) => (
              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-surface-container-low rounded-xl border border-outline-variant/5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-primary">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">{report.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">{report.type}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-[10px] font-bold text-outline uppercase">{new Date(report.date).toLocaleString()}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-[10px] font-bold text-outline uppercase">{report.count} records</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-secondary-container text-on-secondary-container">
                    Generated
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
