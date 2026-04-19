import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getRole } from '../utils/auth';

const Dashboard = () => {
  const role = getRole();
  const [metrics, setMetrics] = useState({ total: 0, resolved: 0, pending: 0, highPriority: 0, slaViolations: 0, categories: {} });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const complaintsUrl = role === 'CUSTOMER' ? '/api/complaints/me' : '/api/complaints';
        const [mRes, cRes] = await Promise.all([
          api.get('/api/analytics'),
          api.get(complaintsUrl)
        ]);
        setMetrics(mRes.data);
        setRecent(cRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role]);

  const isCustomer = role === 'CUSTOMER';

  return (
    <div className="flex-1 p-0 md:p-4 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-black text-on-surface tracking-tighter">
          {isCustomer ? 'My Support Dashboard' : 'Operational Intelligence'}
        </h1>
        <p className="text-sm text-on-surface-variant font-medium">
          {isCustomer ? 'Track your active complaints and resolution status.' : 'Global overview of system health and customer friction.'}
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">folder_open</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 opacity-70">
              {isCustomer ? 'My Total Complaints' : 'Total Volume'}
            </p>
            <h3 className="font-headline font-black text-5xl text-on-surface tracking-tighter">{metrics.total}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[28px]">pending_actions</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 opacity-70">Active Tickets</p>
            <h3 className="font-headline font-black text-5xl text-on-surface tracking-tighter">{metrics.pending}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-1.5 bg-error"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[28px] icon-fill">warning</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 opacity-70">
              {isCustomer ? 'My High Priority' : 'SLA Violations'}
            </p>
            <h3 className="font-headline font-black text-5xl text-on-surface tracking-tighter">
              {isCustomer ? metrics.highPriority : metrics.slaViolations}
            </h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-surface-container-high rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">task_alt</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 opacity-70">Resolved Cases</p>
            <h3 className="font-headline font-black text-5xl text-on-surface tracking-tighter">{metrics.resolved}</h3>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-surface-container-low rounded-[2rem] p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight">
              {isCustomer ? 'My Recent Complaints' : 'System Wide Stream'}
            </h3>
            {!isCustomer && (
              <Link to="/complaints" className="text-primary hover:underline text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Explore History <span className="material-symbols-outlined text-[18px]">arrow_forward_ios</span>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {recent.map(complaint => (
              <Link to={`/complaints/${complaint.id}`} key={complaint.id} className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between group hover:translate-x-1 transition-all shadow-[0px_8px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${complaint.priority === 'High' ? 'bg-error' : complaint.priority === 'Medium' ? 'bg-tertiary' : 'bg-secondary'}`}></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-on-surface-variant opacity-60 uppercase tracking-tighter">REF: {complaint.ticketId || complaint.id.substring(0, 8)}</p>
                    <h4 className="text-base font-bold text-on-surface truncate mt-0.5">{complaint.text}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{complaint.category}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-[10px] text-on-surface-variant font-bold">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-6">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    complaint.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' :
                    complaint.status === 'ESCALATED' ? 'bg-error text-white' :
                    'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {complaint.status}
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">arrow_right_alt</span>
                </div>
              </Link>
            ))}
            {!loading && recent.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant text-sm border-2 border-dashed border-outline-variant/20 rounded-[2rem] font-medium italic opacity-60">
                {isCustomer ? 'You have not submitted any complaints yet.' : 'No complaints in the system yet.'}
              </div>
            )}
            {loading && <div className="text-center py-16 animate-pulse text-primary font-black uppercase tracking-widest">Hydrating Dashboard...</div>}
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-8">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 relative overflow-hidden shadow-[0px_16px_48px_rgba(15,23,42,0.06)]">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
            <h3 className="font-headline font-black text-xl text-on-surface mb-8 relative z-10 tracking-tight">Strategic Actions</h3>
            <div className="flex flex-col gap-4 relative z-10">
              <Link to="/submit" className="w-full bg-gradient-to-r from-primary to-primary-container dark:from-primary-container dark:to-surface-container-high text-on-primary rounded-2xl py-4 px-6 flex items-center justify-between font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 dark:shadow-primary/10">
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined icon-fill">add_circle</span> New Complaint
                </span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>

              {!isCustomer ? (
                <Link to="/sla" className="w-full bg-surface-container-low text-on-surface rounded-2xl py-4 px-6 flex items-center justify-between font-bold text-sm hover:bg-surface-container transition-all">
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">priority_high</span> Review SLA Alerts
                  </span>
                  <span className="bg-error text-white text-[10px] px-2.5 py-1 rounded-full font-black">{metrics.slaViolations || 0}</span>
                </Link>
              ) : (
                <Link to="/notifications" className="w-full bg-surface-container-low text-on-surface rounded-2xl py-4 px-6 flex items-center justify-between font-bold text-sm hover:bg-surface-container transition-all">
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">notifications</span> My Updates
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>

          {!isCustomer ? (
            <div className="bg-surface-container-low rounded-[2rem] p-8 border-l-8 border-secondary relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px] icon-fill">auto_awesome</span>
                </div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">AI Intelligence</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed font-body font-medium">
                {metrics.total > 0
                  ? `${metrics.pending} cases in active queue. ${metrics.slaViolations || 0} are at risk of SLA breach. Resolution velocity: ${metrics.avgResolutionHours || 0}h avg.`
                  : "AI Engine standby. No complaints to analyze yet."
                }
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-secondary to-on-secondary-container dark:from-secondary-container dark:to-surface-container-high text-white dark:text-on-surface rounded-[2rem] p-8 relative overflow-hidden border dark:border-secondary/30">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-secondary/10 blur-3xl"></div>
              <div className="flex items-center gap-3 mb-4 relative">
                <span className="material-symbols-outlined text-white dark:text-secondary icon-fill text-[20px]">verified_user</span>
                <span className="text-[10px] font-black text-white/70 dark:text-secondary uppercase tracking-[0.2em]">Your Coverage</span>
              </div>
              <h4 className="text-xl font-headline font-extrabold mb-2 relative">Priority support active</h4>
              <p className="text-xs text-white/80 dark:text-on-surface-variant font-medium leading-relaxed relative">
                Your tickets are triaged by AI as soon as submitted. Check Notifications for updates from our support team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
