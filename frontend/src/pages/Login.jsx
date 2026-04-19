import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../utils/theme';
import { API_BASE } from '../utils/api';
import MobileInput from '../components/MobileInput';

const Login = () => {
  const [params] = useSearchParams();
  const { isDark, toggle } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileValid, setMobileValid] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register');

  useEffect(() => {
    if (params.get('mode') === 'register') setIsRegister(true);
  }, [params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Mobile is optional on register, but if supplied it must be valid.
    if (isRegister && mobileNumber && !mobileValid) {
      setError('Mobile number must be exactly 10 digits, or leave it blank.');
      return;
    }
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { username, password, mobileNumber }
        : { username, password };
      const res = await axios.post(`${API_BASE}${endpoint}`, payload);

      if (isRegister) {
        setIsRegister(false);
        setMobileNumber('');
        setError('Registered! Please login now.');
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background text-on-surface overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-secondary/20 blur-3xl"></div>
      </div>

      {/* Top-left back to home */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Home
      </Link>

      {/* Top-right theme toggle */}
      <button
        onClick={toggle}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
      </button>

      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-8 sm:p-10 shadow-2xl shadow-primary/10 border border-outline-variant/15">
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary text-on-primary items-center justify-center mb-4 shadow-xl shadow-primary/30">
            <span className="material-symbols-outlined icon-fill text-3xl">radar</span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-primary mb-1">
            ComplainTracker AI
          </h1>
          <p className="text-sm font-medium text-on-surface-variant">
            {isRegister ? 'Create your customer account' : 'Log in to your dashboard'}
          </p>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${error.includes('Registered') ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">person</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="block w-full rounded-xl pl-10 pr-3 py-3 text-sm font-medium bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">lock</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="block w-full rounded-xl pl-10 pr-3 py-3 text-sm font-medium bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Mobile Number <span className="opacity-60">(optional)</span>
              </label>
              <MobileInput
                value={mobileNumber}
                onChange={setMobileNumber}
                onValidity={setMobileValid}
              />
              <p className="text-[11px] mt-1.5 text-on-surface-variant opacity-70">
                Saves typing later — we'll prefill this when you submit a complaint.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-black text-on-primary uppercase tracking-widest bg-gradient-to-r from-primary to-primary-container shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isRegister ? 'Register' : 'Login'}
            <span className="material-symbols-outlined ml-2 text-lg">arrow_forward</span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-on-surface-variant">
            {isRegister ? 'Already have an account?' : 'Need a customer account?'}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="font-black text-primary hover:underline">
              {isRegister ? 'Login here' : 'Register here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
