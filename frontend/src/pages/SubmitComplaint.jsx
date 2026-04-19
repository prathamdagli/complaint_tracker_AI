import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_BASE } from '../utils/api';
import { getRole } from '../utils/auth';
import MobileInput from '../components/MobileInput';

const SubmitComplaint = () => {
  const role = getRole() || 'CSE';
  const isCustomer = role === 'CUSTOMER';

  const [text, setText] = useState('');
  const [source, setSource] = useState('web');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileValid, setMobileValid] = useState(false);
  const [profileMobile, setProfileMobile] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/me')
      .then(res => {
        if (!mounted) return;
        const m = res.data?.mobileNumber || '';
        setProfileMobile(m);
        setMobileNumber(m);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const absoluteUrl = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${API_BASE}${u}`);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setUploadError('Only image files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5 MB.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/api/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url;
      if (url) {
        setImageUrl(url);
        setImagePreview(absoluteUrl(url));
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  };

  const handleBrowse = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setImageUrl('');
    setImagePreview('');
    setUploadError('');
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text) return;
    // Mobile is required for customers, optional for staff — but if provided, must be 10 digits.
    if (isCustomer && !mobileValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!isCustomer && mobileNumber && !mobileValid) {
      setError('Mobile number must be exactly 10 digits, or leave it blank.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/api/complaints', { text, source, mobileNumber, imageUrl });
      setResult(res.data.complaint);
      setText('');
      // keep mobileNumber pre-filled from profile so it's ready for next submission
      setMobileNumber(profileMobile);
      clearImage();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 md:pb-12 bg-background animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            {isCustomer ? 'How can we help?' : 'Submit Complaint'}
          </h2>
          <p className="text-on-surface-variant font-body text-lg max-w-2xl font-medium">
            {isCustomer
              ? 'Tell us about the issue you are facing. Our AI will prioritize your request immediately.'
              : 'Enter the raw complaint details below. Our AI will instantly categorize and prioritize.'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/10 space-y-8">
          <form onSubmit={handleAnalyze} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-3">
                <label className="block font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {isCustomer ? 'Describe your issue' : 'Raw Complaint Data'}
                </label>
                <textarea
                  className="w-full bg-surface-container-low border-none rounded-2xl p-6 font-body text-on-surface focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-outline font-medium"
                  placeholder={isCustomer ? "Please explain what happened, including any error messages..." : "Paste or type the customer's exact words here..."}
                  rows="8"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-6">
                {!isCustomer && (
                  <div className="space-y-3">
                    <label className="block font-label text-sm uppercase tracking-wider text-on-surface-variant font-semibold">Source Channel</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none bg-surface-container border-none rounded-lg p-4 font-body text-on-surface focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                      >
                        <option value="web">Web Portal</option>
                        <option value="email">Email</option>
                        <option value="call">Phone Call</option>
                        <option value="social">Social Media</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <label className="block font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Mobile Number {isCustomer && <span className="text-error">*</span>}
                  </label>
                  <MobileInput
                    value={mobileNumber}
                    onChange={setMobileNumber}
                    onValidity={setMobileValid}
                    required={isCustomer}
                  />
                  {isCustomer && profileMobile && (
                    <p className="text-[10px] text-on-surface-variant font-medium opacity-70">
                      Prefilled from your profile. Edit here if you want to use a different number for this complaint, or update it in <Link to="/settings" className="text-primary font-bold hover:underline">Settings → Profile</Link>.
                    </p>
                  )}
                  {isCustomer && !profileMobile && (
                    <p className="text-[10px] text-on-surface-variant font-medium opacity-70">
                      Tip: save your number in <Link to="/settings" className="text-primary font-bold hover:underline">Settings → Profile</Link> and you won't need to type it again.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Image Proof (Optional)</label>
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest">
                  <img src={imagePreview} alt="Uploaded proof" className="w-full max-h-80 object-contain" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-xs font-black text-error shadow-md hover:bg-white flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-8 flex flex-col items-center justify-center text-center gap-2 ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[32px] text-primary">cloud_upload</span>
                  <p className="font-bold text-sm text-on-surface">
                    {uploading ? 'Uploading...' : 'Drag and drop an image, or click to browse'}
                  </p>
                  <p className="text-[10px] font-medium text-on-surface-variant">PNG, JPG up to 5 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBrowse}
                  />
                </div>
              )}
              {uploadError && <p className="text-error text-xs font-bold">{uploadError}</p>}
            </div>

            {error && <p className="text-error text-sm font-medium">{error}</p>}
            <div className="pt-4 flex justify-between items-center">
              <p className="text-[10px] text-on-surface-variant font-bold max-w-xs leading-relaxed italic opacity-60">
                {isCustomer ? 'By submitting, you agree to our support terms. Resolution typical within 24h.' : 'Ensure accurate data entry for optimal AI triage.'}
              </p>
              <button
                type="submit"
                disabled={loading || uploading}
                className="bg-gradient-to-r from-primary to-primary-container text-white font-headline font-black py-4 px-10 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group disabled:opacity-50"
              >
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : 'group-hover:rotate-12'} transition-transform text-[22px]`}>
                  {loading ? 'sync' : 'verified'}
                </span>
                {loading ? 'Processing...' : (isCustomer ? 'Submit Request' : 'Analyze Case')}
              </button>
            </div>
          </form>
        </div>

        {result && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-2xl font-headline font-black text-on-surface flex items-center gap-3 tracking-tighter">
              <span className="material-symbols-outlined text-secondary icon-fill text-3xl">auto_awesome</span>
              Intelligence Results
            </h3>
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border-l-[12px] border-secondary flex flex-col gap-8 relative overflow-hidden">
              <div className="flex flex-wrap gap-4 items-center">
                <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                  result.priority === 'High' ? 'bg-error-container text-on-error-container' :
                  result.priority === 'Medium' ? 'bg-tertiary-container text-on-tertiary-fixed-variant' :
                  'bg-secondary-container text-on-secondary-container'
                }`}>
                  <span className="material-symbols-outlined text-[16px] icon-fill">warning</span>
                  Priority: {result.priority}
                </div>
                <div className="bg-surface-container px-4 py-2 rounded-full text-sm font-bold border border-outline-variant/20">
                  Category: {result.category}
                </div>
                <div className="bg-surface-container px-4 py-2 rounded-full text-sm font-bold border border-outline-variant/20">
                  Ticket: {result.ticketId}
                </div>
                <div className="ml-auto flex items-center gap-2 text-secondary font-headline font-bold text-lg">
                  <span className="material-symbols-outlined text-[20px] icon-fill">check_circle</span>
                  AI Validated
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-headline text-lg font-semibold text-on-surface">AI Analysis Summary</h4>
                <p className="font-body text-on-surface-variant leading-relaxed text-base border-l-2 border-surface-container pl-4">
                  {result.explanation}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-outline-variant/15">
                <div className="space-y-4">
                  <h4 className="font-headline text-lg font-semibold text-on-surface">Recommended Action</h4>
                  <div className="p-4 bg-surface-container rounded-lg border border-outline-variant/10 text-on-surface font-medium italic">
                    {result.recommendation}
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <Link
                    to={`/complaints/${result.id}`}
                    className="w-full bg-secondary-container text-on-secondary-container font-headline font-semibold py-3 px-4 rounded-md shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    View Case Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="w-full bg-white text-on-surface-variant font-headline font-semibold py-2 px-4 rounded-md border border-outline-variant/20"
                  >
                    Submit Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitComplaint;
