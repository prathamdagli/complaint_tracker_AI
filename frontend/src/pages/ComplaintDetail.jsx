import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { API_BASE } from '../utils/api';
import { getRole, getUser } from '../utils/auth';

const SLA_HOURS = { High: 24, Medium: 48, Low: 72 };

const formatTimer = (ms) => {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getRole();
  const user = getUser();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isStaff = ['CSE', 'QA', 'MANAGER', 'ADMIN'].includes(role);
  const isSuperior = ['MANAGER', 'ADMIN'].includes(role);
  const canDelete = ['QA', 'MANAGER', 'ADMIN'].includes(role);
  const isQA = role === 'QA';
  const canEditClassification = ['QA', 'MANAGER', 'ADMIN'].includes(role);
  const isCustomer = role === 'CUSTOMER';

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawChoices, setWithdrawChoices] = useState([]);
  const [withdrawOther, setWithdrawOther] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  // AI reply drafter (staff)
  const [showDrafter, setShowDrafter] = useState(false);
  const [draftTone, setDraftTone] = useState('empathetic');
  const [draftInstruction, setDraftInstruction] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSending, setDraftSending] = useState(false);
  const [draftError, setDraftError] = useState('');

  const generateDraft = async () => {
    setDraftLoading(true);
    setDraftError('');
    try {
      const res = await api.post(`/api/complaints/${id}/draft-reply`, { tone: draftTone, instruction: draftInstruction });
      setDraftText(res.data.draft);
    } catch (err) {
      setDraftError(err.response?.data?.error || 'Could not generate a draft. Is the AI assistant configured?');
    } finally {
      setDraftLoading(false);
    }
  };

  const sendDraftToCustomer = async () => {
    if (!draftText.trim()) return;
    setDraftSending(true);
    setDraftError('');
    try {
      await api.post(`/api/complaints/${id}/customer-message`, { text: draftText.trim() });
      setMessage({ type: 'success', text: 'Message sent to the customer and logged on this ticket.' });
      setShowDrafter(false);
      setDraftText('');
      setDraftInstruction('');
      load();
    } catch (err) {
      setDraftError(err.response?.data?.error || 'Could not send the message.');
    } finally {
      setDraftSending(false);
    }
  };

  const load = async () => {
    try {
      const res = await api.get(`/api/complaints/${id}`);
      setComplaint(res.data);
      setStatus(res.data.status);
      setPriority(res.data.priority);
      setCategory(res.data.category);
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load complaint' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleUpdate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { status };
      if (canEditClassification) {
        payload.priority = priority;
        payload.category = category;
      }
      await api.put(`/api/complaints/${id}`, payload);
      setMessage({ type: 'success', text: 'Complaint updated. The customer has been notified.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleEscalate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/api/complaints/${id}`, { status: 'ESCALATED', priority: 'High' });
      setMessage({ type: 'success', text: 'Case escalated to High priority.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Escalation failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const prompt = isQA
      ? 'Briefly explain why this submission does not qualify as a valid complaint. The customer will be notified in polished language.'
      : 'Optional reason for deleting this complaint (shown to the customer).';
    const reason = window.prompt(prompt, '');
    if (reason === null) return;
    if (!window.confirm('Permanently delete this complaint? The customer will be notified.')) return;
    setSaving(true);
    try {
      await api.delete(`/api/complaints/${id}`, { data: { reason } });
      navigate('/complaints');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Delete failed' });
      setSaving(false);
    }
  };

  const WITHDRAW_REASONS = [
    { id: 'resolved', label: 'My issue is resolved — no further help needed.' },
    { id: 'taking_too_long', label: 'This is taking too long and I\'d rather try another channel.' },
    { id: 'misread', label: 'I misread the product instructions — not a real issue.' },
    { id: 'duplicate', label: 'I submitted this twice by mistake.' }
  ];

  const toggleWithdrawReason = (key) => {
    setWithdrawChoices(list => list.includes(key) ? list.filter(x => x !== key) : [...list, key]);
  };

  const composeWithdrawReason = () => {
    const picked = WITHDRAW_REASONS.filter(r => withdrawChoices.includes(r.id)).map(r => r.label);
    const other = withdrawOther.trim();
    if (other) picked.push(`Other: ${other}`);
    return picked.join(' | ');
  };

  const handleWithdraw = async () => {
    const reason = composeWithdrawReason();
    if (!reason) {
      setMessage({ type: 'error', text: 'Please pick at least one reason or describe why you are taking back the complaint.' });
      return;
    }
    if (!window.confirm('Withdraw this complaint? The support team will be notified that you no longer need help with it.')) return;
    setWithdrawSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/api/complaints/${id}/withdraw`, { reason });
      setMessage({ type: 'success', text: 'Complaint withdrawn. Thank you for letting us know.' });
      setShowWithdraw(false);
      setWithdrawChoices([]);
      setWithdrawOther('');
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not withdraw the complaint.' });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      const res = await api.post(`/api/complaints/${id}/notes`, { text: noteText });
      setNotes(list => [res.data, ...list]);
      setNoteText('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not post note' });
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-medium">Loading details...</div>;
  if (!complaint) return <div className="p-8 text-center text-error font-medium">Complaint not found.</div>;

  const createdAt = new Date(complaint.createdAt).getTime();
  const slaMs = (SLA_HOURS[complaint.priority] || 72) * 3600 * 1000;
  const deadline = createdAt + slaMs;
  const remainingMs = deadline - now;
  const elapsedPct = Math.min(100, Math.max(0, ((now - createdAt) / slaMs) * 100));
  const breached = remainingMs < 0 && complaint.status !== 'RESOLVED';

  return (
    <div className="flex-1 p-0 md:p-4 flex flex-col gap-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors">arrow_back</button>
            <h1 className="font-headline font-black text-4xl tracking-tighter text-on-surface">
              Case {complaint.ticketId || complaint.id.substring(0, 8)}
            </h1>
          </div>
          <p className="text-on-surface-variant text-sm font-medium pl-9">Submitted on {new Date(complaint.createdAt).toLocaleString()}</p>
        </div>
        {isCustomer && complaint.status !== 'WITHDRAWN' && complaint.status !== 'RESOLVED' && (
          <div className="flex flex-wrap gap-3 pl-9 md:pl-0 w-full md:w-auto">
            <button
              onClick={() => setShowWithdraw(true)}
              className="px-5 py-2.5 rounded-md font-label text-sm font-bold text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
              title="Take back this complaint"
            >
              Withdraw Complaint
            </button>
          </div>
        )}
        {isCustomer && complaint.status === 'WITHDRAWN' && (
          <div className="pl-9 md:pl-0 w-full md:w-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-black uppercase tracking-widest">
              <span className="material-symbols-outlined text-[16px]">block</span>
              Withdrawn by you
            </span>
          </div>
        )}
        {isStaff && (
          <div className="flex flex-wrap gap-3 pl-9 md:pl-0 w-full md:w-auto">
            <button
              onClick={handleEscalate}
              disabled={saving}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-md font-label text-sm font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              Escalate
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-md font-label text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-container shadow-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply Changes'}
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-md font-label text-sm font-bold text-error border border-error/30 hover:bg-error-container/10 transition-colors disabled:opacity-50"
                title={isQA ? 'Dismiss as not a valid complaint' : 'Delete complaint'}
              >
                {isQA ? 'Dismiss' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </header>

      {message && (
        <div className={`rounded-xl p-4 text-sm font-bold ${message.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
          {message.text}
        </div>
      )}

      {complaint.status === 'WITHDRAWN' && complaint.withdrawnReason && (
        <div className="rounded-xl p-5 bg-surface-container-low border-l-4 border-outline-variant/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-80 mb-2">Withdrawn by customer</p>
          <p className="text-sm text-on-surface font-medium">{complaint.withdrawnReason}</p>
          {complaint.withdrawnAt && (
            <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mt-2">
              {new Date(complaint.withdrawnAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {showDrafter && isStaff && (
        <div className="fixed inset-0 z-[100] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline font-black text-2xl tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary icon-fill">auto_awesome</span>
                  Draft a reply with AI
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Gemma reads this ticket's context and drafts a polished customer-facing message. Edit freely before sending.
                </p>
              </div>
              <button
                onClick={() => setShowDrafter(false)}
                className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">Tone</label>
                <select
                  value={draftTone}
                  onChange={e => setDraftTone(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="empathetic">Empathetic</option>
                  <option value="professional">Professional</option>
                  <option value="apologetic">Apologetic</option>
                  <option value="reassuring">Reassuring</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">Extra guidance (optional)</label>
                <input
                  value={draftInstruction}
                  onChange={e => setDraftInstruction(e.target.value)}
                  placeholder="e.g. replacement dispatched today"
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-medium border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <button
              onClick={generateDraft}
              disabled={draftLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              <span className={`material-symbols-outlined text-[18px] ${draftLoading ? 'animate-spin' : ''} icon-fill`}>{draftLoading ? 'sync' : 'auto_awesome'}</span>
              {draftLoading ? 'Drafting…' : (draftText ? 'Regenerate' : 'Generate draft')}
            </button>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">Draft (editable)</label>
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={8}
                placeholder="Your draft will appear here. You can edit it freely before sending."
                className="w-full bg-surface-container-low rounded-xl p-4 text-sm font-medium border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>

            {draftError && <p className="text-xs font-bold text-error">{draftError}</p>}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-outline-variant/10">
              <button
                onClick={() => setShowDrafter(false)}
                className="px-5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendDraftToCustomer}
                disabled={draftSending || !draftText.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-black text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {draftSending ? 'Sending…' : 'Send to customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && isCustomer && (
        <div className="fixed inset-0 z-[100] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline font-black text-2xl tracking-tight text-on-surface">Withdraw this complaint?</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Let us know why so we can keep improving. Our team will be notified that you no longer need help with this case.
                </p>
              </div>
              <button
                onClick={() => setShowWithdraw(false)}
                className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              {WITHDRAW_REASONS.map(r => (
                <label key={r.id} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-2xl cursor-pointer hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={withdrawChoices.includes(r.id)}
                    onChange={() => toggleWithdrawReason(r.id)}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium text-on-surface">{r.label}</span>
                </label>
              ))}
              <div className="p-3 bg-surface-container-low rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">Other (optional)</label>
                <textarea
                  value={withdrawOther}
                  onChange={e => setWithdrawOther(e.target.value)}
                  rows="3"
                  placeholder="Share any extra context so we understand..."
                  className="w-full bg-white rounded-xl p-3 text-sm font-medium border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <button
                onClick={() => setShowWithdraw(false)}
                className="px-5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm"
              >
                Keep Complaint
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawSubmitting}
                className="px-5 py-2.5 rounded-xl bg-error text-white font-black text-sm shadow-lg disabled:opacity-50"
              >
                {withdrawSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10">
            <h2 className="font-headline font-bold text-lg mb-4 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary icon-fill">description</span>
              Original Submission
            </h2>
            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
              <p className="text-on-surface font-body leading-relaxed mb-6 whitespace-pre-wrap">"{complaint.text}"</p>
              <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-on-surface-variant pt-4 border-t border-outline-variant/10 uppercase tracking-[0.2em] opacity-80">
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] icon-fill">person</span> {complaint.User?.username || 'Unknown'}</span>
                {complaint.mobileNumber && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] icon-fill">phone</span> {complaint.mobileNumber}</span>}
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] icon-fill">verified</span> Identity Confirmed</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border-l-8 border-secondary border border-outline-variant/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary icon-fill">psychology</span>
                AI Editorial Intelligence
              </h2>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-secondary tracking-widest uppercase mb-1">Sentiment</span>
                <span className="font-headline font-black text-2xl text-secondary">{Math.round((complaint.sentiment + 1) * 50)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest block mb-2">Categorization</span>
                <span className="font-headline font-bold text-on-surface text-lg">{complaint.category}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest block mb-2">Sentiment Triage</span>
                <span className={`font-headline font-bold text-lg ${complaint.priority === 'High' ? 'text-error' : 'text-secondary'}`}>
                  {complaint.sentiment < -0.3 ? 'Frustrated' : complaint.sentiment < 0 ? 'Negative' : 'Neutral'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest block mb-2">AI Summary & Logic</span>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/5 border-l-2 border-secondary">
                  {complaint.explanation}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest block mb-2">Recommendation</span>
                <p className="text-sm font-bold text-on-surface bg-secondary-container/20 p-4 rounded-lg border border-secondary/10 italic">
                  {complaint.recommendation}
                </p>
              </div>
            </div>
          </div>

          {complaint.imageUrl && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10">
              <h2 className="font-headline font-bold text-lg mb-4 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary icon-fill">image</span>
                Visual Evidence & Proof
              </h2>
              <div className="rounded-2xl overflow-hidden border border-outline-variant/10 group relative">
                <img src={/^https?:\/\//i.test(complaint.imageUrl) ? complaint.imageUrl : `${API_BASE}${complaint.imageUrl}`} alt="Complaint Evidence" className="w-full h-auto max-h-[500px] object-contain bg-surface-container-lowest" />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-xl p-6 border border-outline-variant/10 shadow-sm">
            <h3 className="font-headline font-bold text-base text-on-surface mb-6 uppercase tracking-tight">Case Management</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Workflow Status</label>
                <select
                  value={status}
                  disabled={!isStaff || complaint.status === 'WITHDRAWN'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/10 rounded-lg p-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  <option value="OPEN">Open - Investigation</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="RESOLVED">Resolved</option>
                  {complaint.status === 'WITHDRAWN' && <option value="WITHDRAWN">Withdrawn</option>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Priority</label>
                {canEditClassification ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={`w-full rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 ${
                      priority === 'High' ? 'bg-error-container text-on-error-container' :
                      priority === 'Medium' ? 'bg-tertiary-container text-on-tertiary-fixed-variant' :
                      'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                ) : (
                  <div className={`p-4 rounded-lg flex items-center justify-between font-headline font-black text-sm uppercase ${
                    complaint.priority === 'High' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {complaint.priority}
                    <span className="material-symbols-outlined icon-fill">{complaint.priority === 'High' ? 'priority_high' : 'check'}</span>
                  </div>
                )}
              </div>

              {canEditClassification && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-container rounded-lg p-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Product">Product</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Trade">Trade</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div className="pt-6 border-t border-outline-variant/15">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-4">SLA Timer</label>
                <div className="text-center">
                  <span className={`font-headline font-black text-4xl tracking-tighter ${breached ? 'text-error' : 'text-on-surface'}`}>
                    {formatTimer(remainingMs)}
                  </span>
                  <p className="text-[10px] text-on-surface-variant font-bold mt-2">
                    {breached ? `BREACHED ${new Date(deadline).toLocaleString()}` : `TARGET ${new Date(deadline).toLocaleString()}`}
                  </p>
                  <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className={`h-full transition-all ${breached ? 'bg-error' : elapsedPct > 80 ? 'bg-tertiary' : 'bg-secondary'}`} style={{ width: `${elapsedPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 shadow-sm">
            <h3 className="font-headline font-bold text-sm text-on-surface mb-4 uppercase tracking-tighter">
              {isStaff ? 'Internal Resolution Log' : 'Support Team Notes'}
            </h3>
            <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto scrollbar-hide">
              {notes.length === 0 && (
                <p className="text-xs text-on-surface-variant italic opacity-60">No notes yet.</p>
              )}
              {notes.map(note => (
                <div key={note.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex-shrink-0 flex items-center justify-center font-black text-[10px]">
                    {(note.author?.username || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-on-surface font-medium bg-white p-3 rounded-lg rounded-tl-none border border-outline-variant/5 break-words whitespace-pre-wrap">{note.text}</p>
                    <span className="text-[9px] text-on-surface-variant font-bold mt-1 uppercase block">
                      {note.author?.username} • {note.author?.role} • {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {isStaff && (
              <div className="space-y-3">
                <form onSubmit={addNote} className="relative">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 pr-10 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Add internal note..."
                  />
                  <button type="submit" disabled={!noteText.trim()} className="absolute right-3 top-3 text-primary disabled:opacity-30">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => { setShowDrafter(true); setDraftText(''); setDraftError(''); setDraftInstruction(''); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-secondary/15 to-primary/15 hover:from-secondary/25 hover:to-primary/25 text-primary font-black text-xs uppercase tracking-widest transition-all border border-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px] icon-fill">auto_awesome</span>
                  Draft reply with AI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
