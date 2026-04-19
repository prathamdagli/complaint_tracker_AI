import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { getRole, getUser } from '../utils/auth';
import MobileInput from '../components/MobileInput';

const ADMIN_ROLES = ['CUSTOMER', 'CSE', 'QA', 'MANAGER', 'ADMIN'];
const MANAGER_ROLES = ['CUSTOMER', 'CSE', 'QA'];

const randomPassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
};

const Settings = () => {
  const role = getRole();
  const me = getUser();
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const canManageUsers = isAdmin || isManager;
  const isCustomer = role === 'CUSTOMER';

  const assignableRoles = isAdmin ? ADMIN_ROLES : MANAGER_ROLES;

  const location = useLocation();
  const wantsUsers = location.pathname === '/users';

  const [tab, setTab] = useState(wantsUsers && canManageUsers ? 'users' : canManageUsers ? 'users' : 'profile');

  useEffect(() => {
    if (wantsUsers && canManageUsers) setTab('users');
  }, [wantsUsers, canManageUsers]);

  // User management
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: assignableRoles[1] || assignableRoles[0] });
  const [lastCreated, setLastCreated] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState(null);
  const [resetFor, setResetFor] = useState(null); // user id we're resetting password for
  const [resetPwd, setResetPwd] = useState('');

  // Password change
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Profile (mobile number)
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileValid, setMobileValid] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/me')
      .then(r => { if (mounted) setMobileNumber(r.data?.mobileNumber || ''); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const saveMobile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    // If the user typed something, it must be valid. Blank is allowed (clears the number).
    if (mobileNumber && !mobileValid) {
      setProfileMsg({ type: 'error', text: 'Mobile number must be exactly 10 digits, or leave it blank to clear.' });
      return;
    }
    setProfileLoading(true);
    try {
      const res = await api.put('/api/auth/profile', { mobileNumber });
      setMobileNumber(res.data?.user?.mobileNumber || '');
      setProfileMsg({ type: 'success', text: 'Profile updated. New complaints will use this number by default.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Could not update mobile number.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Notification preferences (stored locally)
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_prefs') || '{"email":true,"desktop":true,"status_updates":true,"sla_alerts":true}'); }
    catch { return { email: true, desktop: true, status_updates: true, sla_alerts: true }; }
  });

  useEffect(() => {
    localStorage.setItem('notif_prefs', JSON.stringify(prefs));
  }, [prefs]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (canManageUsers) fetchUsers();
  }, [canManageUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUserLoading(true); setUserMsg(null); setLastCreated(null);
    try {
      await api.post('/api/admin/users', newUser);
      setLastCreated({ username: newUser.username, password: newUser.password, role: newUser.role });
      setUserMsg({ type: 'success', text: `User "${newUser.username}" created. Share the temporary password shown below with them.` });
      setNewUser({ username: '', password: '', role: assignableRoles[1] || assignableRoles[0] });
      setShowAddUser(false);
      fetchUsers();
    } catch (err) {
      setUserMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create user' });
    } finally { setUserLoading(false); }
  };

  const canEditTarget = (target) => {
    if (target.id === me?.id) return false;
    if (isAdmin) return true;
    if (isManager) return MANAGER_ROLES.includes(target.role);
    return false;
  };

  const changeRole = async (userId, nextRole) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { role: nextRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change role');
    }
  };

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? Their complaints will be kept but unlinked.`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const submitPasswordReset = async (userId) => {
    if (!resetPwd || resetPwd.length < 4) return alert('Password must be at least 4 characters');
    try {
      await api.put(`/api/admin/users/${userId}`, { password: resetPwd });
      setLastCreated({ username: users.find(u => u.id === userId)?.username, password: resetPwd, role: users.find(u => u.id === userId)?.role, reset: true });
      setResetFor(null);
      setResetPwd('');
      setUserMsg({ type: 'success', text: 'Temporary password set. Share it with the user.' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.newPassword !== pwd.confirm) {
      return setPwdMsg({ type: 'error', text: 'New password and confirmation do not match.' });
    }
    setPwdLoading(true);
    try {
      await api.put('/api/auth/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.error || 'Password update failed' });
    } finally { setPwdLoading(false); }
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: 'person', show: true },
    { id: 'password', label: 'Password', icon: 'lock', show: true },
    { id: 'notifications', label: 'Notification Preferences', icon: 'notifications_active', show: true },
    { id: 'users', label: 'User Management', icon: 'manage_accounts', show: canManageUsers }
  ].filter(i => i.show);

  const filteredUsers = users.filter(u => {
    if (userRoleFilter !== 'All' && u.role !== userRoleFilter) return false;
    if (userSearch && !u.username.toLowerCase().includes(userSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 p-0 md:p-4 bg-background animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tighter text-on-surface">Settings</h1>
          <p className="text-on-surface-variant text-base max-w-2xl font-medium">
            Manage your {isCustomer ? 'profile' : 'system'} configurations and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <nav className="flex flex-col gap-1 bg-surface-container-low p-4 rounded-3xl">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-4 py-3 font-bold rounded-2xl transition-all flex items-center gap-3 text-left ${
                    tab === item.id ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary hover:bg-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${tab === item.id ? 'icon-fill' : ''}`}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-9 space-y-8">
            {tab === 'profile' && (
              <div className="bg-white rounded-[2rem] p-10 border border-outline-variant/10 shadow-sm space-y-10">
                <div>
                  <h2 className="font-headline font-black text-3xl text-on-surface tracking-tight mb-2">My Profile</h2>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Personal Identity & Security</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase flex items-center gap-2 text-on-surface-variant opacity-70">
                      <span className="material-symbols-outlined text-[16px]">id_card</span> Username
                    </label>
                    <div className="p-4 bg-surface-container-low rounded-2xl font-black text-on-surface flex items-center justify-between">
                      <span>{me?.username || 'Unknown'}</span>
                      <span className="material-symbols-outlined text-outline opacity-40">lock</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase flex items-center gap-2 text-on-surface-variant opacity-70">
                      <span className="material-symbols-outlined text-[16px]">shield</span> Current Role
                    </label>
                    <div className="p-4 bg-surface-container-low rounded-2xl font-black text-primary flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="tracking-widest capitalize">{role}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveMobile} className="pt-6 border-t border-outline-variant/10 space-y-4">
                  <label className="text-[10px] font-black uppercase flex items-center gap-2 text-on-surface-variant opacity-70">
                    <span className="material-symbols-outlined text-[16px]">call</span> Mobile Number {isCustomer && <span className="font-normal normal-case opacity-80">(prefilled on complaint submissions)</span>}
                  </label>
                  <MobileInput
                    value={mobileNumber}
                    onChange={setMobileNumber}
                    onValidity={setMobileValid}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileLoading || (mobileNumber && !mobileValid)}
                      className="bg-primary text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {profileLoading ? 'Saving...' : 'Save Number'}
                    </button>
                  </div>
                  {profileMsg && (
                    <p className={`text-xs font-bold ${profileMsg.type === 'success' ? 'text-secondary' : 'text-error'}`}>{profileMsg.text}</p>
                  )}
                  <p className="text-xs text-on-surface-variant font-medium">
                    Username cannot be changed. Use the Password tab to update credentials.
                    {isCustomer && ' Contact support to change your role or for account deletion.'}
                  </p>
                </form>
              </div>
            )}

            {tab === 'password' && (
              <div className="bg-white rounded-[2rem] p-10 border border-outline-variant/10 shadow-sm space-y-6 max-w-xl">
                <div>
                  <h2 className="font-headline font-black text-2xl text-on-surface tracking-tight mb-2">Change Password</h2>
                  <p className="text-xs text-on-surface-variant font-medium">Use a strong password that you don't reuse elsewhere.</p>
                </div>
                <form onSubmit={changePassword} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest block mb-2">Current Password</label>
                    <input
                      type="password" required
                      value={pwd.currentPassword}
                      onChange={e => setPwd({ ...pwd, currentPassword: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest block mb-2">New Password</label>
                    <input
                      type="password" required minLength={4}
                      value={pwd.newPassword}
                      onChange={e => setPwd({ ...pwd, newPassword: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest block mb-2">Confirm New Password</label>
                    <input
                      type="password" required
                      value={pwd.confirm}
                      onChange={e => setPwd({ ...pwd, confirm: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {pwdMsg && (
                    <p className={`text-xs font-bold ${pwdMsg.type === 'success' ? 'text-secondary' : 'text-error'}`}>{pwdMsg.text}</p>
                  )}
                  <button type="submit" disabled={pwdLoading} className="bg-primary text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50">
                    {pwdLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="bg-white rounded-[2rem] p-10 border border-outline-variant/10 shadow-sm space-y-8 max-w-2xl">
                <div>
                  <h2 className="font-headline font-black text-2xl text-on-surface tracking-tight mb-2">Notification Preferences</h2>
                  <p className="text-xs text-on-surface-variant font-medium">Control which alerts you want to see. Saved to this device.</p>
                </div>
                {[
                  { key: 'status_updates', label: 'Complaint status updates', desc: 'When your complaint status changes (in progress, resolved, etc).' },
                  { key: 'sla_alerts', label: 'SLA breach alerts', desc: isCustomer ? 'If your high-priority case takes too long to be resolved.' : 'System-wide SLA breaches affecting your queue.' },
                  { key: 'email', label: 'Email notifications', desc: 'Copy notifications to your email inbox.' },
                  { key: 'desktop', label: 'Desktop notifications', desc: 'In-app browser notifications when you are logged in.' }
                ].map(p => (
                  <label key={p.key} className="flex items-start gap-4 p-5 bg-surface-container-low rounded-2xl cursor-pointer hover:bg-surface-container transition-colors">
                    <input
                      type="checkbox"
                      checked={!!prefs[p.key]}
                      onChange={e => setPrefs({ ...prefs, [p.key]: e.target.checked })}
                      className="mt-1 w-5 h-5 accent-primary"
                    />
                    <div>
                      <p className="font-bold text-on-surface">{p.label}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {tab === 'users' && canManageUsers && (
              <div className="bg-surface-container-low rounded-[2rem] p-8 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-headline font-black text-2xl text-on-surface tracking-tight">System Access</h2>
                    <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest opacity-60">
                      {isAdmin ? 'Role Assignments & Provisioning' : 'Manage CSE, QA and Customer accounts'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowAddUser(v => !v); setUserMsg(null); setLastCreated(null); }}
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    {showAddUser ? 'Cancel' : 'Create New Profile'}
                  </button>
                </div>

                {isManager && (
                  <div className="bg-primary/5 border-l-4 border-primary rounded-2xl p-5 flex items-start gap-4">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <div>
                      <p className="font-bold text-on-surface text-sm">Manager provisioning rights</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">
                        You can create, edit and remove <span className="font-bold text-primary">Customer, CSE, and QA</span> accounts.
                        ADMIN and MANAGER accounts can only be provisioned by an Administrator.
                      </p>
                    </div>
                  </div>
                )}

                {showAddUser && (
                  <div className="bg-white rounded-[2rem] p-8 shadow-xl animate-in zoom-in-95 duration-300">
                    <h3 className="font-headline font-bold text-xl mb-2">Create New Account</h3>
                    <p className="text-xs text-on-surface-variant font-medium mb-6">
                      Assign a username and a temporary password. The user can sign in immediately with these credentials and change their password from Settings.
                    </p>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Username / Login ID</label>
                        <input
                          className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none focus:ring-2 focus:ring-primary/20"
                          value={newUser.username}
                          onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                          placeholder="e.g. sarah.qa or sarah@co.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
                          <span>Temporary Password</span>
                          <button
                            type="button"
                            onClick={() => setNewUser({ ...newUser, password: randomPassword() })}
                            className="text-[10px] font-black text-primary uppercase hover:underline"
                          >
                            Generate
                          </button>
                        </label>
                        <input
                          type="text"
                          className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none font-mono focus:ring-2 focus:ring-primary/20"
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Click Generate or type one"
                          minLength={4}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Assigned Role</label>
                        <select
                          className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-bold border-none focus:ring-2 focus:ring-primary/20"
                          value={newUser.role}
                          onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                        >
                          {assignableRoles.includes('CUSTOMER') && <option value="CUSTOMER">Customer</option>}
                          {assignableRoles.includes('CSE') && <option value="CSE">Customer Support Engineer (CSE)</option>}
                          {assignableRoles.includes('QA') && <option value="QA">Quality Assurance (QA)</option>}
                          {assignableRoles.includes('MANAGER') && <option value="MANAGER">Operations Manager</option>}
                          {assignableRoles.includes('ADMIN') && <option value="ADMIN">System Administrator</option>}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex flex-col md:flex-row md:justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowAddUser(false)} className="px-6 py-3 bg-surface-container rounded-xl font-bold">Cancel</button>
                        <button type="submit" disabled={userLoading} className="px-8 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 disabled:opacity-50">
                          {userLoading ? 'Creating...' : 'Create & Issue Credentials'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {userMsg && (
                  <div className={`rounded-2xl p-4 text-sm font-bold ${userMsg.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                    {userMsg.text}
                  </div>
                )}

                {lastCreated && (
                  <div className="bg-white border-2 border-secondary/30 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="material-symbols-outlined text-secondary icon-fill">vpn_key</span>
                      <h4 className="font-headline font-bold text-base text-on-surface">
                        {lastCreated.reset ? 'Password Reset' : 'New Account Credentials'}
                      </h4>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium mb-4">
                      Share these credentials securely with the user. They will not be shown again.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-surface-container-low rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Role</p>
                        <p className="font-black text-on-surface">{lastCreated.role}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Username</p>
                        <p className="font-black text-on-surface break-all">{lastCreated.username}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Temp Password</p>
                        <p className="font-black text-on-surface font-mono break-all">{lastCreated.password}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`Username: ${lastCreated.username}\nPassword: ${lastCreated.password}\nRole: ${lastCreated.role}`);
                          setUserMsg({ type: 'success', text: 'Credentials copied to clipboard.' });
                        }}
                        className="bg-primary text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest"
                      >
                        Copy Credentials
                      </button>
                      <button onClick={() => setLastCreated(null)} className="bg-surface-container text-on-surface-variant font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="Search by username"
                    />
                  </div>
                  <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="px-4 py-2.5 bg-white rounded-lg text-sm font-bold border border-outline-variant/10 cursor-pointer">
                    <option value="All">All roles</option>
                    {ADMIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                          <th className="py-5 px-8 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Identity</th>
                          <th className="py-5 px-8 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Role</th>
                          <th className="py-5 px-8 font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredUsers.map(u => {
                          const editable = canEditTarget(u);
                          const isSelf = u.id === me?.id;
                          return (
                            <tr key={u.id} className="hover:bg-surface-container-low/30 transition-colors">
                              <td className="py-5 px-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-black text-xs">
                                    {u.username.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-on-surface">{u.username}</span>
                                    <span className="text-[10px] font-bold text-on-surface-variant opacity-60">Created {new Date(u.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-8">
                                {!editable ? (
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${isSelf ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                    {u.role}{isSelf ? ' (you)' : ''}
                                  </span>
                                ) : (
                                  <select
                                    value={u.role}
                                    onChange={(e) => changeRole(u.id, e.target.value)}
                                    className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-surface-container-high text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                                  >
                                    {assignableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                )}
                              </td>
                              <td className="py-5 px-8 text-right">
                                {editable && (
                                  <div className="flex items-center justify-end gap-2">
                                    {resetFor === u.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={resetPwd}
                                          onChange={e => setResetPwd(e.target.value)}
                                          placeholder="New temp pwd"
                                          className="bg-surface-container-low rounded-lg px-3 py-1.5 text-xs font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
                                        />
                                        <button onClick={() => setResetPwd(randomPassword())} className="text-[10px] font-black text-primary uppercase hover:underline">Gen</button>
                                        <button
                                          onClick={() => submitPasswordReset(u.id)}
                                          className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
                                        >
                                          Set
                                        </button>
                                        <button onClick={() => { setResetFor(null); setResetPwd(''); }} className="text-on-surface-variant text-[10px] font-black uppercase">
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => { setResetFor(u.id); setResetPwd(''); }}
                                          className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors"
                                          title="Reset password"
                                        >
                                          <span className="material-symbols-outlined text-[18px]">key</span>
                                        </button>
                                        <button
                                          onClick={() => deleteUser(u.id, u.username)}
                                          className="text-error hover:bg-error-container/20 rounded-lg p-2 transition-colors"
                                          title="Delete user"
                                        >
                                          <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan="3" className="py-10 text-center text-on-surface-variant italic">No users match the filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
