import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Phone, 
  Mail, 
  MessagesSquare, 
  ShieldCheck,
  Terminal,
  Send,
  ChevronRight,
  CheckCircle,
  Zap,
  LifeBuoy,
  Loader2,
} from 'lucide-react';
import { 
  Card, 
  Button, 
  Badge, 
  cn 
} from '../components/ui/base';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const SUPPORT_EMAIL = 'support@indease.com';

const SUBJECTS = [
  'Payment Issue',
  'Service Issue',
  'Account Issue',
  'Machine Diagnosis Issue',
  'Expert Consultation',
  'Billing Inquiry',
  'Other',
];

export function SupportView({ user }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: SUBJECTS[0],
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill name and email from user prop or localStorage
  useEffect(() => {
    const storedUser = user || (() => {
      try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
    })();
    if (storedUser) {
      const name = storedUser.firstName
        ? `${storedUser.firstName} ${storedUser.lastName || ''}`.trim()
        : storedUser.name || `${storedUser.first_name || ''} ${storedUser.last_name || ''}`.trim() || '';
      setForm(prev => ({
        ...prev,
        name: name || prev.name,
        email: storedUser.email || prev.email,
      }));
    }
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async () => {
    if (!form.message.trim()) {
      showToast('Please enter a message before submitting.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/support/tickets', {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        description: form.message,
      });
      setSubmitted(true);
      showToast('Your request has been sent. Our team will contact you soon.');
      setForm(prev => ({ ...prev, message: '' }));
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      showToast(
        `Something went wrong. Please contact support at ${SUPPORT_EMAIL}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto animate-fade-in pt-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 9999,
              minWidth: 320,
              maxWidth: 420,
            }}
          >
            <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm font-semibold text-sm ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <CheckCircle size={18} strokeWidth={2.5} className={`mt-0.5 shrink-0 ${toast.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="leading-snug">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-4">
        <div className="space-y-2">
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Help & Support</h2>
           <p className="text-sm font-medium text-slate-500 max-w-2xl">
             Submit a support request and our team will get back to you via email. You can also reach us directly at{' '}
             <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal-600 hover:underline font-medium">IndEase Support</a>.
           </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="h-10 px-4 flex items-center bg-teal-50 text-teal-700 rounded-lg border border-teal-100 font-semibold text-sm gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Support Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Support Form */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-8 lg:p-10 shadow-sm space-y-8 h-full">
            <div className="space-y-6">
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight flex items-center gap-2">
                  <Terminal size={18} className="text-teal-600" />
                  Submit a Request
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Your Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Auto-filled"
                    className="w-full h-11 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Your Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Auto-filled"
                    className="w-full h-11 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Subject</label>
                  <div className="relative">
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full h-11 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Message</label>
                    <span className="text-xs text-slate-500 font-medium">We'll reply to your email</span>
                  </div>
                  <textarea
                    placeholder="Describe your issue in detail..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full h-32 rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm font-medium text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB]">
                <button
                  onClick={handleSubmit}
                  disabled={loading || submitted}
                  className="h-11 px-8 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending...</>
                  ) : submitted ? (
                    <><CheckCircle size={16} strokeWidth={2.5} /> Sent Successfully</>
                  ) : (
                    <>Submit Request <Send size={16} strokeWidth={2.5} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-6 shadow-sm space-y-6 relative overflow-hidden group">
            <h3 className="text-lg font-semibold text-slate-900 leading-tight">Contact Us Directly</h3>
            <div className="space-y-4">
              <ContactItem icon={Mail} label="IndEase Support" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
              <ContactItem icon={Phone} label="Support Hours" value="Monday – Saturday, 9 AM – 6 PM IST" />
              <ContactItem icon={MessagesSquare} label="Response Time" value="Within 24 hours" />
            </div>
          </div>

          <div className="bg-teal-50/50 border border-teal-100 rounded-[16px] p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="relative z-10 flex items-start gap-3">
              <HelpCircle className="text-teal-600 mt-0.5" size={20} strokeWidth={2.5} />
              <div>
                <h4 className="text-sm font-bold text-blue-900 mb-1">
                  Urgent Issues
                </h4>
                <p className="text-xs text-blue-800/80 font-medium leading-relaxed">
                  For critical system failures or immediate assistance, email our priority support team directly.
                </p>
              </div>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full text-center h-10 flex items-center justify-center rounded-lg font-semibold text-sm bg-white border border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white hover:border-teal-600 shadow-sm transition-all relative z-10">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, href }) {
  return (
    <div 
      className={`flex items-start gap-4 p-3 rounded-xl transition-all ${href ? 'cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-100' : ''}`} 
      onClick={href ? () => window.open(href) : undefined}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="flex flex-col flex-1 pb-1">
        <span className="text-xs font-semibold text-slate-500 mb-0.5">{label}</span>
        <span className="text-sm font-medium text-slate-900">{value}</span>
      </div>
      {href && (
        <div className="flex items-center text-slate-400 self-center">
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  );
}
