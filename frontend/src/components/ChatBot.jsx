import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { getUser } from '../utils/auth';

const GREETING = {
  role: 'assistant',
  content: "Hi! I'm ComplainTracker's AI assistant. Ask me about your tickets (status, category, next steps) or anything about how this platform works."
};

const ChatBot = () => {
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  if (!user) return null;

  const send = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError('');
    try {
      // Send only the actual conversation (skip the hardcoded greeting)
      const apiMessages = next.filter(m => m !== GREETING);
      const res = await api.post('/api/chat', { messages: apiMessages });
      setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'AI assistant is unavailable right now.');
      setMessages(m => m.slice(0, -1)); // roll back the user message so they can retry
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = user.role === 'CUSTOMER' ? [
    "What's the status of my latest complaint?",
    "How long until my high-priority ticket is resolved?",
    "How do I withdraw a complaint?"
  ] : [
    "Summarise today's open complaints",
    "How many high-priority tickets are still pending?",
    "How does the QA feedback loop work?"
  ];

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          title="Chat with ComplainTracker AI"
        >
          <div className="absolute inset-0 rounded-full bg-primary blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-transform">
            <span className="material-symbols-outlined icon-fill text-[26px]">auto_awesome</span>
          </div>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-3rem))] h-[min(620px,calc(100vh-3rem))] flex flex-col bg-surface-container-lowest rounded-3xl shadow-2xl shadow-primary/20 border border-outline-variant/20 animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined icon-fill text-[20px]">auto_awesome</span>
              </div>
              <div>
                <p className="font-headline font-black text-sm tracking-tight">ComplainTracker AI</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-md font-medium'
                    : 'bg-surface-container-low text-on-surface rounded-bl-md font-medium border border-outline-variant/15'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low text-on-surface rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 border border-outline-variant/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-error-container text-on-error-container rounded-2xl px-4 py-2.5 text-xs font-bold">
                {error}
              </div>
            )}
          </div>

          {/* Quick prompts — show only on first turn */}
          {messages.length === 1 && !sending && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickPrompts.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20 text-[11px] font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={send} className="p-4 border-t border-outline-variant/15 bg-surface-container-lowest">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder="Ask something…"
                className="flex-1 bg-surface-container-low rounded-2xl px-4 py-2.5 text-sm font-medium border border-outline-variant/15 focus:ring-2 focus:ring-primary/20 outline-none resize-none max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mt-2 text-center">
              Powered by Gemma · Replies may need verification
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
