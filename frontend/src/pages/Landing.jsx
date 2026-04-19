import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/theme';

const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('is-visible'), delay);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal-on-scroll ${className}`}>{children}</div>;
};

const Counter = ({ to, suffix = '', duration = 1500 }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(Math.round(eased * to));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* Animated card stack in the hero — shows fake complaints being classified in real time */
const TriageVisual = () => {
  const initial = [
    { id: 'CMP-7841', text: 'Refrigerator stopped cooling after 3 weeks', cat: 'Product', pri: 'High', tone: 'error' },
    { id: 'CMP-7840', text: 'The box arrived with tape torn off', cat: 'Packaging', pri: 'Medium', tone: 'tertiary' },
    { id: 'CMP-7839', text: 'Need bulk pricing for 500 units', cat: 'Trade', pri: 'Low', tone: 'secondary' },
  ];
  const rotate = [
    { id: 'CMP-7842', text: 'App keeps crashing when I add items', cat: 'Product', pri: 'High', tone: 'error' },
    { id: 'CMP-7843', text: 'Wrapper was resealed — looks tampered', cat: 'Packaging', pri: 'High', tone: 'error' },
    { id: 'CMP-7844', text: 'Quote for wholesale order?', cat: 'Trade', pri: 'Low', tone: 'secondary' },
    { id: 'CMP-7845', text: 'Device turns off randomly', cat: 'Product', pri: 'Medium', tone: 'tertiary' },
  ];
  const [cards, setCards] = useState(initial);
  const idx = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      const next = rotate[idx.current % rotate.length];
      idx.current += 1;
      setCards(prev => [next, ...prev.slice(0, 2)]);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const toneMap = {
    error: 'bg-error/10 text-error border-error/30',
    tertiary: 'bg-tertiary/10 text-tertiary border-tertiary/30',
    secondary: 'bg-secondary/10 text-secondary border-secondary/30',
  };

  return (
    <div className="relative w-full h-[540px] max-w-lg mx-auto">
      {/* Decorative grid bg */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-on-surface" fill="none" viewBox="0 0 400 540" aria-hidden>
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="540" fill="url(#grid)" />
      </svg>

      {/* Glowing blobs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/30 blur-3xl"></div>
      <div className="absolute bottom-10 -left-5 w-56 h-56 rounded-full bg-secondary/25 blur-3xl"></div>

      {/* Orbit — the AI brain */}
      <div className="absolute left-1/2 top-16 -translate-x-1/2 w-40 h-40">
        <div className="absolute inset-0 rounded-full border border-primary/30 animate-float-slow"></div>
        <div className="absolute inset-3 rounded-full border border-secondary/30 animate-float-slower"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-container shadow-2xl shadow-primary/40 flex items-center justify-center">
            <span className="material-symbols-outlined icon-fill text-5xl text-on-primary">psychology</span>
          </div>
        </div>
        <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <div className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
        <div className="absolute -bottom-1 left-1/2 w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
      </div>

      {/* Card stack */}
      <div className="absolute inset-x-0 bottom-0 top-64 px-2">
        <div className="relative w-full h-full">
          {cards.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              className="absolute inset-x-0 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 shadow-2xl shadow-primary/10 transition-all duration-500"
              style={{
                top: `${i * 60}px`,
                zIndex: 10 - i,
                transform: `scale(${1 - i * 0.04})`,
                opacity: i === 0 ? 1 : 0.85 - i * 0.15,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant">REF · {c.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${toneMap[c.tone]}`}>{c.pri}</span>
              </div>
              <p className="text-sm font-bold text-on-surface truncate">{c.text}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-[14px] text-secondary icon-fill">auto_awesome</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{c.cat}</span>
                <div className="flex-1 h-px bg-outline-variant/20 mx-1"></div>
                <span className="text-[9px] font-bold text-on-surface-variant opacity-70">triaged in 2.1s</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Landing = () => {
  const { isDark, toggle } = useTheme();

  return (
    <div className="bg-background text-on-surface font-body min-h-screen overflow-x-hidden">
      {/* =================== NAV =================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xl shadow-primary/30">
              <span className="material-symbols-outlined icon-fill text-2xl">radar</span>
            </div>
            <div className="leading-none">
              <p className="font-headline font-black tracking-tighter text-lg">ComplainTracker</p>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1 opacity-80">AI INFRASTRUCTURE</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#roles" className="hover:text-primary transition-colors">Roles</a>
            <a href="#problem" className="hover:text-primary transition-colors">Problem</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <Link to="/login" className="hidden sm:inline-block px-4 py-2 rounded-xl font-bold text-sm hover:bg-surface-container-low transition-colors">
              Log in
            </Link>
            <Link
              to="/login?mode=register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-black text-sm shadow-lg shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* =================== HERO (split layout, text-left) =================== */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 -left-40 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-float-slower"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/25 blur-3xl animate-float-slow"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/20 text-xs font-black tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                AI-native complaint infrastructure
              </div>

              <h1 className="font-display font-black tracking-tight leading-[1.05] text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem]">
                Every complaint,{' '}
                <span className="text-gradient-primary italic inline-block pr-[0.25em]">triaged, prioritized</span>{' '}
                and resolved — in seconds.
              </h1>

              <p className="text-lg md:text-xl max-w-xl text-on-surface-variant font-medium leading-relaxed">
                An AI engine that classifies customer complaints, scores urgency, and recommends resolutions in real time — and
                <span className="font-black text-primary"> learns from every QA correction</span> so it keeps getting sharper.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  to="/login?mode=register"
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  Register as Customer
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <Link
                  to="/login"
                  className="px-7 py-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-on-surface font-black text-sm uppercase tracking-widest hover:bg-surface-container transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">login</span>
                  Log in
                </Link>
              </div>

              {/* Tech strip */}
              <div className="pt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-on-surface-variant">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Powered by</span>
                <span>TF-IDF</span>
                <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
                <span>Logistic Regression</span>
                <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
                <span>VADER Sentiment</span>
                <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
                <span className="text-primary">Real-time Retrain</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <TriageVisual />
            </div>
          </div>
        </div>
      </section>

      {/* =================== STATS (horizontal, with dividers) =================== */}
      <section className="relative border-y border-outline-variant/15 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-outline-variant/15">
            {[
              { value: 50000, suffix: '+', label: 'Training Complaints' },
              { value: 4, suffix: '', label: 'AI Agents' },
              { value: 3, suffix: 's', label: 'Avg Triage Time' },
              { value: 99, suffix: '%', label: 'Routing Accuracy' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="px-4 md:px-8 first:pl-0 last:pr-0">
                  <p className="font-display font-black tracking-tighter text-5xl md:text-6xl text-gradient-primary leading-none">
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =================== HOW IT WORKS — compact horizontal pipeline =================== */}
      <section id="how" className="relative py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2 max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">The Flow</p>
                <h2 className="font-display font-black tracking-tighter text-4xl md:text-5xl leading-[1.05]">
                  From raw complaint to <span className="text-gradient-primary italic">resolution.</span>
                </h2>
              </div>
              <p className="text-sm md:text-base text-on-surface-variant font-medium max-w-sm">
                Three steps. Seconds, not hours. The loop closes itself — the model gets smarter every time QA disagrees with it.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative grid md:grid-cols-3 gap-5 md:gap-0">
              {/* Connector line behind cards (desktop) */}
              <div className="hidden md:block absolute left-[16.66%] right-[16.66%] top-12 h-px bg-gradient-to-r from-primary/40 via-secondary/40 to-tertiary/40 -z-0"></div>

              {[
                { n: '01', icon: 'edit_note', title: 'Submit', body: 'Customer describes the issue. Drag-and-drop proof. Mobile auto-prefilled.', chip: 'bg-primary/10 text-primary', dot: 'bg-primary', ring: 'ring-primary/30' },
                { n: '02', icon: 'psychology', title: 'AI Triage', body: 'TF-IDF + Logistic Regression classify. VADER scores sentiment. Rules set priority.', chip: 'bg-secondary/10 text-secondary', dot: 'bg-secondary', ring: 'ring-secondary/30' },
                { n: '03', icon: 'verified', title: 'Human-in-the-loop', body: 'CSE resolves. QA corrects mispredictions — the classifier retrains in real time.', chip: 'bg-tertiary/10 text-tertiary', dot: 'bg-tertiary', ring: 'ring-tertiary/30' }
              ].map((s, i) => (
                <div key={i} className="relative md:px-4 first:md:pl-0 last:md:pr-0">
                  {/* Dot on the connector line */}
                  <div className={`hidden md:flex absolute left-1/2 top-10 w-5 h-5 -translate-x-1/2 rounded-full ${s.dot} ring-4 ${s.ring} ring-offset-4 ring-offset-background`}></div>

                  <div className="md:pt-20 md:pb-0">
                    <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/30 hover:shadow-xl transition-all h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-11 h-11 rounded-xl ${s.chip} flex items-center justify-center`}>
                          <span className="material-symbols-outlined icon-fill text-xl">{s.icon}</span>
                        </div>
                        <span className="font-display font-black text-3xl text-outline-variant/40 leading-none">{s.n}</span>
                      </div>
                      <h3 className="font-display font-black text-xl tracking-tight mb-2">{s.title}</h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant font-medium">{s.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* =================== FEATURES — clean asymmetric grid =================== */}
      <section id="features" className="relative py-20 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2 max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">The Stack</p>
                <h2 className="font-display font-black tracking-tighter text-4xl md:text-5xl leading-[1.05]">
                  Built for modern support <span className="text-gradient-primary italic">ops.</span>
                </h2>
              </div>
              <p className="text-sm md:text-base text-on-surface-variant font-medium max-w-sm">
                Everything a support team needs — intake to analytics — without stitching four SaaS tools together.
              </p>
            </div>
          </Reveal>

          {/* Row 1 — hero tile (2 cols) + classification tile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Reveal className="md:col-span-2">
              <div className="h-full p-7 md:p-8 rounded-3xl bg-gradient-to-br from-primary to-primary-container text-on-primary overflow-hidden relative group">
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-on-primary/10 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-on-primary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined icon-fill text-3xl">school</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-80 mb-2">
                      <span className="w-8 h-px bg-on-primary/50"></span>
                      Signature feature
                    </div>
                    <h3 className="font-display font-black text-2xl md:text-3xl tracking-tight mb-2">Real-time learning</h3>
                    <p className="text-sm md:text-base text-on-primary/80 font-medium leading-relaxed">
                      Every QA correction is stored and immediately triggers a weighted retrain. Same complaint? Corrected. Paraphrase? Also corrected.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="h-full p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/30 transition-all flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined icon-fill">auto_awesome</span>
                </div>
                <h3 className="font-headline font-black mb-1">Classification</h3>
                <p className="text-xs text-on-surface-variant font-medium">Product / Packaging / Trade / Other — tagged instantly by TF-IDF + Logistic Regression.</p>
              </div>
            </Reveal>
          </div>

          {/* Row 2 — three uniform tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { icon: 'sentiment_very_dissatisfied', chip: 'bg-secondary/10 text-secondary', hover: 'hover:border-secondary/30', title: 'Sentiment Scoring', body: 'VADER compound score drives priority — frustrated customers jump the queue.' },
              { icon: 'timer', chip: 'bg-tertiary/10 text-tertiary', hover: 'hover:border-tertiary/30', title: 'SLA Monitoring', body: 'Per-ticket countdown. Breach alerts delivered to CSE, QA and managers with escalation paths.' },
              { icon: 'group', chip: 'bg-primary/10 text-primary', hover: 'hover:border-primary/30', title: 'Role Dashboards', body: 'Customer, CSE, QA, Manager, Admin — each role sees exactly what it needs.' }
            ].map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className={`h-full p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/15 ${f.hover} transition-all`}>
                  <div className={`w-11 h-11 rounded-xl ${f.chip} flex items-center justify-center mb-4`}>
                    <span className="material-symbols-outlined icon-fill">{f.icon}</span>
                  </div>
                  <h3 className="font-headline font-black mb-1">{f.title}</h3>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Row 3 — three horizontal tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'hub', chip: 'bg-secondary/10 text-secondary', hover: 'hover:border-secondary/30', title: 'Multi-channel', body: 'Web, email, phone, social — one triage pipeline.' },
              { icon: 'image', chip: 'bg-primary/10 text-primary', hover: 'hover:border-primary/30', title: 'Drag-and-drop Evidence', body: 'Attach image proof without clicking through a dialog.' },
              { icon: 'undo', chip: 'bg-tertiary/10 text-tertiary', hover: 'hover:border-tertiary/30', title: 'Customer Withdrawal', body: 'Take complaints back with a reason — whole team notified.' }
            ].map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className={`h-full p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 ${f.hover} transition-all flex items-center gap-4`}>
                  <div className={`w-11 h-11 shrink-0 rounded-xl ${f.chip} flex items-center justify-center`}>
                    <span className="material-symbols-outlined icon-fill">{f.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-sm mb-0.5">{f.title}</h3>
                    <p className="text-xs text-on-surface-variant font-medium leading-snug">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =================== LEARNING LOOP (split) =================== */}
      <section className="relative py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Signature Feature</p>
              <h2 className="font-display font-black tracking-tighter text-4xl md:text-6xl leading-[1.05]">
                A model that <span className="text-gradient-primary">learns as it listens</span>.
              </h2>
              <p className="text-lg text-on-surface-variant font-medium leading-relaxed">
                When QA re-labels a complaint, the correction is stored <em>and</em> the classifier is retrained immediately
                — weighted 5× against the base dataset. Next time a near-identical complaint arrives, the engine returns
                the corrected label within milliseconds. Paraphrases benefit from the retrained weights.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-full bg-secondary/10 text-secondary text-xs font-black uppercase tracking-widest">Correction Memory</span>
                <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">Weighted Retraining</span>
                <span className="px-4 py-2 rounded-full bg-tertiary/10 text-tertiary text-xs font-black uppercase tracking-widest">Hot Reload</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="relative p-8 rounded-[2.5rem] bg-surface-container-lowest border border-outline-variant/15 shadow-2xl shadow-primary/10 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"></div>
              <div className="relative space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">1</div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Customer submits</p>
                    <p className="text-sm font-bold">"Can I return this refrigerator"</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-tertiary/10 text-tertiary uppercase">Trade ✗</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-black">2</div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">QA corrects</p>
                    <p className="text-sm font-bold">→ Product</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary icon-fill">auto_awesome</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">3</div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Next time — any paraphrase</p>
                    <p className="text-sm font-bold">"Can I return the fridge I bought"</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-secondary/20 text-secondary uppercase">Product ✓</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =================== ROLES — asymmetric with sticky label =================== */}
      <section id="roles" className="relative py-28 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-12 gap-8">
            <Reveal className="lg:col-span-4">
              <div className="lg:sticky lg:top-28 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Who It's For</p>
                <h2 className="font-display font-black tracking-tighter text-4xl md:text-5xl leading-[1.05]">
                  Five dashboards.<br /><span className="text-gradient-primary italic">One source</span> of truth.
                </h2>
                <p className="text-sm text-on-surface-variant font-medium max-w-sm leading-relaxed">
                  Each role gets a purpose-built view — no cluttered admin panels, no hidden power users.
                </p>
              </div>
            </Reveal>

            <div className="lg:col-span-8 space-y-4">
              {[
                { role: 'Customer', icon: 'person', chip: 'bg-primary/10 text-primary', perks: ['Submit in seconds', 'Track live status', 'Withdraw anytime with reason'] },
                { role: 'CSE — Customer Support Engineer', icon: 'support_agent', chip: 'bg-secondary/10 text-secondary', perks: ['Resolve & annotate tickets', 'Track SLA countdown', 'Internal note threads'] },
                { role: 'QA — Quality Assurance', icon: 'fact_check', chip: 'bg-tertiary/10 text-tertiary', perks: ['Flag mispredictions', 'Retrain the model live', 'Dismiss invalid complaints'] },
                { role: 'Manager', icon: 'insights', chip: 'bg-primary/10 text-primary', perks: ['Executive dashboards', 'Provision team accounts', 'Delete / escalate authority'] },
                { role: 'Admin', icon: 'admin_panel_settings', chip: 'bg-secondary/10 text-secondary', perks: ['System-wide configuration', 'All roles + audit log', 'Full data access'] }
              ].map((r, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col md:flex-row gap-5 items-start">
                    <div className={`w-14 h-14 rounded-2xl ${r.chip} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined icon-fill text-2xl">{r.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-black text-lg md:text-xl mb-3">{r.role}</h3>
                      <ul className="grid sm:grid-cols-3 gap-x-4 gap-y-2">
                        {r.perks.map((p, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================== PROBLEM STATEMENT PS-14 =================== */}
      <section id="problem" className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-error/5 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-12 gap-10">
            <Reveal className="lg:col-span-4">
              <div className="lg:sticky lg:top-28 space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-error/10 border border-error/20 text-error text-xs font-black tracking-widest uppercase">
                  <span className="material-symbols-outlined text-[16px] icon-fill">description</span>
                  PS-14
                </div>
                <h2 className="font-display font-black tracking-tighter text-4xl md:text-5xl leading-[1.02]">
                  The wellness industry is <span className="text-gradient-primary italic">drowning</span> in complaints.
                </h2>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  Problem Statement PS-14 · तर्क SHAASTRA · LDCE Lakshya 2.0
                </p>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-8" delay={150}>
              <div className="space-y-10">
                {/* Pull quote */}
                <div className="relative pl-10 md:pl-14">
                  <span className="absolute left-0 top-0 font-display font-black text-7xl md:text-8xl text-primary/20 leading-none">"</span>
                  <p className="text-base md:text-xl font-medium leading-relaxed text-on-surface">
                    In the wellness business, customer complaints pour in through call centres, emails, and direct channels.
                    Each one is reviewed and tagged manually — leading to <span className="font-black text-error">delays</span>,
                    <span className="font-black text-error"> inconsistent categorisation</span>, and <span className="font-black text-error">missed SLAs</span>.
                    There is no intelligent way to prioritize the urgent ones or recommend what to do next.
                    Response times climb. Customer satisfaction dips.
                  </p>
                </div>

                {/* Numbered blocks */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { n: '01', icon: 'trending_down', label: 'Manual backlogs', body: 'Humans tag every ticket by hand.' },
                    { n: '02', icon: 'schedule', label: 'SLA breaches', body: 'Priority is guessed, not scored.' },
                    { n: '03', icon: 'sentiment_dissatisfied', label: 'Declining CSAT', body: 'Slow, inconsistent resolutions.' }
                  ].map((x, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/15">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black text-error opacity-70 tracking-widest">{x.n}</span>
                        <span className="material-symbols-outlined text-error icon-fill text-[18px]">{x.icon}</span>
                      </div>
                      <p className="font-headline font-black text-sm mb-1">{x.label}</p>
                      <p className="text-xs text-on-surface-variant font-medium">{x.body}</p>
                    </div>
                  ))}
                </div>

                {/* The answer */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Our Answer</p>
                  <p className="text-base md:text-lg font-medium leading-relaxed">
                    <strong className="text-primary">ComplainTracker AI</strong> — a system that <strong>automatically classifies</strong> every complaint,
                    <strong> assigns priority</strong> based on urgency and sentiment, and <strong>recommends resolution steps</strong> in real time —
                    so support is faster, more consistent, and more efficient. And thanks to QA-driven real-time learning, it gets sharper every single day.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =================== FINAL CTA =================== */}
      <section className="relative py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="relative p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-primary to-primary-container dark:from-primary-container dark:to-surface-container-high text-on-primary overflow-hidden border dark:border-primary/30">
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-secondary/30 dark:bg-secondary/15 blur-3xl animate-float-slower"></div>
              <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-on-primary/10 dark:bg-primary/10 blur-3xl animate-float-slow"></div>
              <div className="relative grid md:grid-cols-5 gap-8 items-center">
                <div className="md:col-span-3 space-y-6">
                  <h2 className="font-display font-black tracking-tighter text-4xl md:text-6xl leading-[0.95]">
                    Ready to ship<br />smarter support?
                  </h2>
                  <p className="max-w-md text-base md:text-lg text-on-primary/80 font-medium">
                    Spin up a free account — register as a customer, or log in with your team credentials.
                  </p>
                </div>
                <div className="md:col-span-2 flex flex-col gap-3">
                  <Link
                    to="/login?mode=register"
                    className="w-full px-6 py-4 rounded-2xl bg-on-primary text-primary font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.03] active:scale-95 transition-all text-center"
                  >
                    Create free account
                  </Link>
                  <Link
                    to="/login"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-on-primary/40 text-on-primary font-black text-sm uppercase tracking-widest hover:bg-on-primary/10 transition-all text-center"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =================== FOOTER =================== */}
      <footer className="relative pt-16 pb-10 border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined icon-fill">radar</span>
              </div>
              <div>
                <p className="font-headline font-black tracking-tight">ComplainTracker AI</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Intelligence for support ops</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs font-bold text-on-surface-variant">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#how" className="hover:text-primary transition-colors">How it Works</a>
              <a href="#roles" className="hover:text-primary transition-colors">Roles</a>
              <a href="#problem" className="hover:text-primary transition-colors">Problem</a>
            </div>
          </div>

          <div className="pt-8 border-t border-outline-variant/15 flex flex-col items-center gap-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-80">
              Built for
            </p>
            <p className="text-xl md:text-2xl font-display font-black tracking-tight">
              <span className="text-gradient-primary">तर्क SHAASTRA</span> · LDCE Lakshya 2.0 Hackathon
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant opacity-60">
              Problem Statement · PS-14 · Design · Decode · Dominate
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
