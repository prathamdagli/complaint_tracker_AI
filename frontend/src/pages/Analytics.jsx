import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getRole } from '../utils/auth';

const RANGES = [
  { id: 7, label: '7 Days' },
  { id: 30, label: '30 Days' },
  { id: 90, label: '90 Days' }
];

const Analytics = () => {
  const role = getRole();
  const [metrics, setMetrics] = useState({ total: 0, resolved: 0, pending: 0, categories: {}, priorities: {}, trend: [], avgResolutionHours: 0 });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [m, c] = await Promise.all([
          api.get('/api/analytics'),
          role === 'CUSTOMER' ? api.get('/api/complaints/me') : api.get('/api/complaints')
        ]);
        setMetrics(m.data);
        setComplaints(c.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [role]);

  const cutoff = Date.now() - range * 86400000;
  const filtered = useMemo(() => complaints.filter(c => new Date(c.createdAt).getTime() >= cutoff), [complaints, cutoff]);

  const categoryData = useMemo(() => {
    const map = {};
    filtered.forEach(c => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [filtered]);

  const trendData = useMemo(() => {
    const map = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    filtered.forEach(c => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (map[key] !== undefined) map[key]++;
    });
    const step = range > 30 ? Math.ceil(range / 15) : 1;
    return Object.keys(map).filter((_, i) => i % step === 0).map(k => ({ name: k.slice(5), volume: map[k] }));
  }, [filtered, range]);

  const COLORS = ['#ba1a1a', '#7e3000', '#3525cd', '#006b5f', '#4f46e5'];

  const insight = (() => {
    if (!filtered.length) return 'No complaints in selected window. Quiet period detected.';
    const topCat = [...categoryData].sort((a, b) => b.value - a.value)[0];
    const highCount = filtered.filter(c => c.priority === 'High').length;
    const pct = Math.round((highCount / filtered.length) * 100);
    return `${topCat.name} is the dominant category this window (${topCat.value} of ${filtered.length}). ${pct}% of complaints were flagged High priority — focus resolution capacity there.`;
  })();

  return (
    <div className="flex-1 overflow-y-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">Analytics & Insights</h2>
          <p className="text-on-surface-variant text-sm mt-2 font-body max-w-xl leading-relaxed">Complaint volume, category trends, and resolution velocity.</p>
        </div>
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-outline-variant/10">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${range === r.id ? 'text-primary bg-primary-container/10' : 'text-on-surface-variant hover:text-primary'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-white rounded-2xl p-6 relative overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full"></div>
          <h3 className="text-[10px] font-black font-body text-on-surface-variant uppercase tracking-widest mb-1">Total (window)</h3>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-5xl font-headline font-black text-on-surface">{filtered.length}</span>
          </div>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase">{range} day window</p>
        </div>

        <div className="md:col-span-4 bg-white rounded-2xl p-6 relative overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full"></div>
          <h3 className="text-[10px] font-black font-body text-on-surface-variant uppercase tracking-widest mb-1">Avg Resolution</h3>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-5xl font-headline font-black text-on-surface">{metrics.avgResolutionHours || 0}<span className="text-2xl font-medium">h</span></span>
          </div>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase">Across resolved cases</p>
        </div>

        <div className="md:col-span-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl p-6 relative overflow-hidden shadow-lg border-none">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary-fixed icon-fill">auto_awesome</span>
            <h3 className="text-[10px] font-black tracking-widest uppercase">AI Strategic Insight</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed mb-4 text-white/90">{insight}</p>
        </div>

        <div className="md:col-span-8 bg-white border border-outline-variant/10 rounded-2xl p-6 shadow-sm flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">Volume Trend</h3>
            <span className="text-[10px] font-black text-on-surface-variant uppercase bg-surface-container px-2 py-1 rounded">{range}-day window</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                <Line type="monotone" dataKey="volume" stroke="#3525cd" strokeWidth={4} dot={{ r: 5, fill: '#3525cd', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-4 bg-white border border-outline-variant/10 rounded-2xl p-6 shadow-sm flex flex-col h-[450px]">
          <h3 className="text-xl font-headline font-bold text-on-surface mb-6">Categorical Distribution</h3>
          <div className="flex-1">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-on-surface-variant italic">No category data in this window.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1F2937', fontSize: 10, fontWeight: 'bold' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-sm text-on-surface-variant italic">Loading data...</p>}
    </div>
  );
};

export default Analytics;
