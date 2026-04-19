import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getRole, logout, getUser } from '../utils/auth';
import { useTheme } from '../utils/theme';
import api from '../utils/api';
import ChatBot from './ChatBot';

const NAV_ITEMS = {
  CUSTOMER: [
    { path: '/', label: 'My Complaints', icon: 'list_alt' },
    { path: '/submit', label: 'Submit Complaint', icon: 'add_box' },
    { path: '/notifications', label: 'My Updates', icon: 'notifications' },
    { path: '/settings', label: 'Account & Security', icon: 'settings' },
  ],
  CSE: [
    { path: '/', label: 'Operations Dashboard', icon: 'dashboard' },
    { path: '/complaints', label: 'All Complaints', icon: 'list_alt' },
    { path: '/submit', label: 'Submit Complaint', icon: 'add_box' },
    { path: '/analytics', label: 'Category Insights', icon: 'insights' },
    { path: '/sla', label: 'SLA Monitoring', icon: 'timer' },
    { path: '/notifications', label: 'Alert Center', icon: 'notifications' },
    { path: '/reports', label: 'Platform Reports', icon: 'assessment' },
    { path: '/settings', label: 'Team Settings', icon: 'settings' },
  ],
  QA: [
    { path: '/', label: 'Model Validation', icon: 'dashboard' },
    { path: '/complaints', label: 'Review Queue', icon: 'list_alt' },
    { path: '/analytics', label: 'Accuracy Analytics', icon: 'insights' },
    { path: '/sla', label: 'SLA Tracking', icon: 'timer' },
    { path: '/notifications', label: 'Alerts', icon: 'notifications' },
    { path: '/settings', label: 'QA Config', icon: 'settings' },
  ],
  MANAGER: [
    { path: '/', label: 'Strategic Overview', icon: 'dashboard' },
    { path: '/complaints', label: 'Global Overview', icon: 'list_alt' },
    { path: '/analytics', label: 'Business Intel', icon: 'insights' },
    { path: '/sla', label: 'Breach Monitoring', icon: 'timer' },
    { path: '/notifications', label: 'Alerts', icon: 'notifications' },
    { path: '/reports', label: 'Executive Reports', icon: 'assessment' },
    { path: '/users', label: 'User Provisioning', icon: 'group_add' },
    { path: '/settings', label: 'System Settings', icon: 'settings' },
  ],
  ADMIN: [
    { path: '/', label: 'System Intelligence', icon: 'dashboard' },
    { path: '/complaints', label: 'Root Stream', icon: 'list_alt' },
    { path: '/analytics', label: 'Global Metrics', icon: 'insights' },
    { path: '/sla', label: 'SLA Monitoring', icon: 'timer' },
    { path: '/notifications', label: 'Alerts', icon: 'notifications' },
    { path: '/reports', label: 'Reports', icon: 'assessment' },
    { path: '/users', label: 'User Provisioning', icon: 'group_add' },
    { path: '/settings', label: 'Admin Settings', icon: 'settings' },
  ]
};

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const user = getUser();
  const [showHelp, setShowHelp] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { isDark, toggle: toggleTheme } = useTheme();

  const currentNav = NAV_ITEMS[role] || [];

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/api/notifications/unread-count');
        if (!cancelled) setUnread(res.data.count || 0);
      } catch (e) {
        if (!cancelled) setUnread(0);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location.pathname]);

  const avatarInitials = (user?.username || '??').substring(0, 2).toUpperCase();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row overflow-x-hidden font-body">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-surface-container-low border-b border-outline-variant/10 sticky top-0 z-40">
        <button onClick={() => setMobileOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="font-headline font-black tracking-tighter">ComplainTracker</h1>
        <button onClick={() => navigate('/notifications')} className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-white">
          <span className="material-symbols-outlined">notifications</span>
          {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>}
        </button>
      </header>

      {/* Sidebar */}
      <nav className={`h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col p-6 gap-2 z-50 border-r border-outline-variant/10 transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="mb-10 px-2 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-2xl shrink-0 shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined icon-fill text-3xl">radar</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-on-surface font-headline leading-none">ComplainTracker</h1>
            <p className="text-[10px] text-primary font-black tracking-[0.3em] uppercase opacity-80 mt-1">AI INFRASTRUCTURE</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden ml-auto">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {(role === 'CUSTOMER' || role === 'CSE') && (
          <div className="mb-8">
            <Link to="/submit" className="w-full bg-surface-container-lowest text-on-surface rounded-2xl py-4 px-6 flex items-center justify-center gap-3 font-bold text-sm transition-all hover:bg-white hover:shadow-lg active:scale-95 group">
              <span className="material-symbols-outlined text-primary group-hover:rotate-90 transition-transform">add</span>
              Submit Complaint
            </Link>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-2 scrollbar-hide">
          {currentNav.map((item, idx) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                className={`rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-300 ${
                  active ? 'bg-white text-primary shadow-[0px_8px_24px_rgba(53,37,205,0.06)]' : 'text-on-surface-variant hover:text-primary hover:bg-white/50'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${active ? 'icon-fill' : ''}`}>{item.icon}</span>
                <span className="font-bold text-sm tracking-tight flex-1">{item.label}</span>
                {item.path === '/notifications' && unread > 0 && (
                  <span className="bg-error text-white text-[9px] font-black px-2 py-0.5 rounded-full">{unread}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            className="text-on-surface-variant hover:text-primary rounded-2xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-surface-container"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined text-[22px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            <span className="font-bold text-sm flex-1 text-left">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            <span className={`w-10 h-5 rounded-full transition-colors relative ${isDark ? 'bg-primary' : 'bg-outline-variant/40'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isDark ? 'left-5' : 'left-0.5'}`}></span>
            </span>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="text-on-surface-variant hover:text-primary rounded-2xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[22px]">help_center</span>
            <span className="font-bold text-sm">Support Intelligence</span>
          </button>
          <button onClick={logout} className="w-full text-on-surface-variant hover:text-error rounded-2xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-error-container/10">
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span className="font-bold text-sm">Terminate Session</span>
          </button>
        </div>
      </nav>

      {mobileOpen && <div className="fixed inset-0 bg-on-surface/40 z-40 md:hidden" onClick={() => setMobileOpen(false)}></div>}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:ml-72 min-h-screen">
        <header className="hidden md:flex justify-between items-center px-12 py-10 w-full bg-background/90 backdrop-blur-xl z-30 sticky top-0 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-primary rounded-full opacity-20"></div>
            <h2 className="font-headline font-black text-4xl text-on-surface tracking-tighter">
              {currentNav.find(n => n.path === location.pathname)?.label || 'Intelligence Hub'}
            </h2>
          </div>

          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/notifications')}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-all relative group"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">notifications</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-error text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-background">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-4 bg-surface-container-low pr-2 pl-6 py-2 rounded-3xl hover:bg-surface-container transition-all"
              >
                <div className="text-right">
                  <p className="text-sm font-black text-on-surface leading-none tracking-tight">{user?.username}</p>
                  <p className="text-[10px] text-primary uppercase font-black tracking-widest mt-1 opacity-70 italic">{role}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black border-2 border-white shadow-md">
                  {avatarInitials}
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 z-50 overflow-hidden">
                  <div className="p-4 bg-surface-container-low">
                    <p className="font-black text-on-surface truncate">{user?.username}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">{role}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low">
                      <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                      <span className="text-sm font-bold">Settings</span>
                    </Link>
                    <Link to="/notifications" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low">
                      <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                      <span className="text-sm font-bold flex-1">Notifications</span>
                      {unread > 0 && <span className="bg-error text-white text-[9px] font-black px-2 py-0.5 rounded-full">{unread}</span>}
                    </Link>
                    <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-error-container/10 text-error">
                      <span className="material-symbols-outlined">logout</span>
                      <span className="text-sm font-bold">Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 md:px-12 pb-12">
          {children}
        </div>
      </main>

      <ChatBot />

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-on-surface/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                <span className="material-symbols-outlined text-4xl icon-fill">help_center</span>
              </div>
              <div>
                <h3 className="font-headline font-black text-3xl tracking-tighter text-on-surface">Platform Intelligence Support</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-80">Operational Assistance</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-surface-container-low rounded-[2rem] space-y-3 border border-outline-variant/10">
                  <span className="material-symbols-outlined text-primary">auto_fix</span>
                  <h4 className="font-bold text-on-surface">AI Triage Help</h4>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">Every complaint is automatically classified, priority-tagged and given a resolution recommendation.</p>
                </div>
                <div className="p-6 bg-surface-container-low rounded-[2rem] space-y-3 border border-outline-variant/10">
                  <span className="material-symbols-outlined text-secondary">verified_user</span>
                  <h4 className="font-bold text-on-surface">Roles</h4>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">CUSTOMER submits complaints. CSE resolves. QA validates AI. MANAGER/ADMIN monitor and can reassign, delete, or escalate.</p>
                </div>
              </div>

              <a
                href="mailto:support@complaintracker.ai"
                className="block p-6 bg-on-surface text-white rounded-[2rem] relative overflow-hidden text-center"
              >
                <h4 className="font-headline font-black text-lg mb-2">Email Support</h4>
                <p className="text-xs text-white/70 font-medium">support@complaintracker.ai</p>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
