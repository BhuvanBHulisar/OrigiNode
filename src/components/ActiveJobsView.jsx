import React, { useState } from 'react';
import {
  CheckCircle, Circle, ChevronDown, MessageSquare, CheckCircle2,
  Clock, AlertTriangle, Wrench, Flag
} from 'lucide-react';
import { cn } from './ui/base';
import api from '../services/api';

const STAGES = [
  { id: 'en_route',   label: 'En Route' },
  { id: 'arrived',    label: 'Arrived' },
  { id: 'diagnosing', label: 'Diagnosing' },
  { id: 'repairing',  label: 'Repairing' },
  { id: 'testing',    label: 'Testing' },
  { id: 'completed',  label: 'Done' },
];

const stageIndex = (s) => STAGES.findIndex(st => st.id === s);

function ProgressBar({ current }) {
  const ci = stageIndex(current);
  return (
    <div className="flex items-center gap-1 mt-2">
      {STAGES.map((s, i) => {
        const done = i < ci;
        const active = i === ci;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1">
              {done ? (
                <CheckCircle size={16} className="text-emerald-500" />
              ) : active ? (
                <div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-indigo-200" />
              ) : (
                <Circle size={16} className="text-slate-300" />
              )}
              <span className={cn(
                'text-[9px] font-semibold uppercase tracking-wide',
                done ? 'text-emerald-600' : active ? 'text-indigo-600' : 'text-slate-400'
              )}>{s.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-4', i < ci ? 'bg-emerald-400' : 'bg-slate-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Milestone Status Strip ─────────────────────────────────────────────────
function MilestoneStrip({ m1Released, m2Released, disputed }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {/* Milestone 1 */}
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
        m1Released
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      )}>
        {m1Released
          ? <CheckCircle size={12} className="text-emerald-600" />
          : <Clock size={12} className="text-slate-400" />
        }
        M1: {m1Released ? 'Released' : 'Pending'}
      </div>

      {/* Milestone 2 */}
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
        m2Released
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      )}>
        {m2Released
          ? <CheckCircle size={12} className="text-emerald-600" />
          : <Clock size={12} className="text-slate-400" />
        }
        M2: {m2Released ? 'Released' : 'Pending'}
      </div>

      {/* Disputed badge */}
      {disputed && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle size={12} className="text-red-600" />
          DISPUTED
        </div>
      )}
    </div>
  );
}

// ── Job Card ───────────────────────────────────────────────────────────────
function JobCard({ job, onProgressUpdate, onMarkComplete, onOpenChat, onMarkArrived, onMarkStarted, onMarkDone, isDemo }) {
  const [stage, setStage] = useState(job.progressStage || job.progress_stage || 'en_route');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionSummary, setCompletionSummary] = useState('');
  const [partsUsed, setPartsUsed] = useState('');

  const handleSendUpdate = async () => {
    if (!stage) return;
    setSending(true);
    try {
      if (isDemo) {
        onProgressUpdate(job.id, stage, note);
      } else {
        await api.patch(`/jobs/${job.id}/progress`, { stage, note });
        onProgressUpdate(job.id, stage, note);
      }
      setNote('');
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onMarkComplete(job.id, completionSummary, partsUsed);
    } finally {
      setCompleting(false);
    }
  };

  const currentStage = job.progressStage || job.progress_stage || 'en_route';
  const jobStatus = (job.status || job.rawStatus || '').toLowerCase();

  // Derived escrow state
  const m1Released = !!job.milestone1_released;
  const m2Released = !!job.milestone2_released;
  const isDisputed = !!job.disputed;
  const isWorkStarted = jobStatus === 'work_started';
  const isWorkDone    = jobStatus === 'work_done';

  return (
    <div className={cn(
      'bg-white border rounded-[16px] p-6 shadow-sm space-y-4',
      isDisputed ? 'border-red-200 bg-red-50/30' : 'border-[#E5E7EB]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {job.machine_name || job.machineName || 'Machine'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Consumer: {job.client_name || job.consumerName || 'Client'} &nbsp;·&nbsp;
            Accepted: {job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Today'}
          </p>
          <p className="text-sm text-slate-600 mt-1">{job.issue_description || job.issue || 'Service request'}</p>

          {/* Milestone strip */}
          <MilestoneStrip m1Released={m1Released} m2Released={m2Released} disputed={isDisputed} />
        </div>
        <div className="text-right shrink-0 ml-4">
          <span className={cn(
            'text-xs font-bold px-2 py-1 rounded-lg',
            isDisputed ? 'bg-red-100 text-red-700' :
            isWorkStarted ? 'bg-blue-50 text-blue-700' :
            isWorkDone    ? 'bg-amber-50 text-amber-700' :
            'bg-indigo-50 text-indigo-600'
          )}>
            {isDisputed    ? '⚠ Disputed' :
             isWorkStarted ? '🔧 Work Started' :
             isWorkDone    ? '✅ Work Done' :
             (currentStage.charAt(0).toUpperCase() + currentStage.slice(1))}
          </span>
          {(job.quoted_cost || job.value) ? (
            <p className="text-sm font-bold text-slate-900 mt-1">
              ₹{Number(job.quoted_cost || job.value || 0).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar current={currentStage} />

      {/* Update form */}
      <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Update Progress</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-lg border border-[#E5E7EB] text-sm font-medium text-slate-700 bg-white appearance-none focus:outline-none focus:border-indigo-500"
            >
              {STAGES.filter(s => s.id !== 'completed').map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add update for consumer..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <button
          onClick={handleSendUpdate}
          disabled={sending}
          className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send Update'}
        </button>
      </div>

      {/* ── Escrow-aware Action Buttons ── */}
      <div className="space-y-2 pt-2">

        {/* ── DISPUTED: frozen banner ── */}
        {isDisputed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-1">
            <p className="text-sm font-bold text-red-800 flex items-center justify-center gap-2">
              <AlertTriangle size={15} /> Dispute In Progress
            </p>
            <p className="text-xs text-red-600">Escrow is frozen. Admin is reviewing. All actions paused.</p>
          </div>
        )}

        {/* ── PRE-ESCROW: Quote Approved / Accepted / Payment Pending — can mark arrived ── */}
        {!isDisputed && (jobStatus === 'quote_approved' || jobStatus === 'accepted' || jobStatus === 'payment_pending') && (
          <>
            {/* NEW: Mark Started button (calls /mark-started escrow endpoint) */}
            <button
              onClick={() => onMarkStarted && onMarkStarted(job.id)}
              className="w-full h-12 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md"
            >
              <Wrench size={16} /> Mark Work as Started
            </button>
            {/* Fallback: legacy arrive button (calls /arrive if /mark-started not wired) */}
            <button
              onClick={() => onMarkArrived && onMarkArrived(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              📍 Just Mark Arrived (legacy)
            </button>
            <button
              onClick={() => onOpenChat(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Open Chat
            </button>
          </>
        )}

        {/* ── WORK STARTED: waiting for M1 (consumer arrival confirmation) ── */}
        {!isDisputed && isWorkStarted && !m1Released && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-1">
              <p className="text-sm font-bold text-blue-800 flex items-center justify-center gap-2">
                <Clock size={15} /> Waiting for Consumer…
              </p>
              <p className="text-xs text-blue-600">Consumer must confirm your arrival to release Milestone 1.</p>
              <p className="text-xs text-blue-500 mt-1">Auto-releases in 24 hours if no response.</p>
            </div>
            <button
              onClick={() => onOpenChat(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Open Chat
            </button>
          </>
        )}

        {/* ── M1 RELEASED: can now mark work done ── */}
        {!isDisputed && (isWorkStarted && m1Released) && !isWorkDone && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-emerald-800">Milestone 1 payment released! You can now mark work as done.</p>
            </div>
            <button
              onClick={() => onMarkDone && onMarkDone(job.id)}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md"
            >
              <Flag size={16} /> Mark Work as Done
            </button>
            <button
              onClick={() => onOpenChat(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Open Chat
            </button>
          </>
        )}

        {/* ── WORK DONE: waiting for M2 (consumer completion confirmation) ── */}
        {!isDisputed && isWorkDone && !m2Released && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-1">
              <p className="text-sm font-bold text-amber-800 flex items-center justify-center gap-2">
                <Clock size={15} /> Waiting for Consumer…
              </p>
              <p className="text-xs text-amber-600">Consumer must confirm work completion to release Milestone 2 (final payment).</p>
              <p className="text-xs text-amber-500 mt-1">Auto-releases in 72 hours if no response.</p>
            </div>
            <button
              onClick={() => onOpenChat(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Open Chat
            </button>
          </>
        )}

        {/* ── LEGACY in_progress flow (no escrow, old-style complete) ── */}
        {!isDisputed && (jobStatus === 'en_route' || jobStatus === 'in_progress') && !isWorkStarted && !isWorkDone && (
          <div className="space-y-3 pt-2">
            <details className="border border-slate-200 rounded-xl overflow-hidden group">
              <summary className="px-4 py-3 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 list-none flex items-center justify-between">
                <span>✅ Mark Job as Complete</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 space-y-3 border-t border-slate-100">
                <textarea
                  placeholder="Completion summary for consumer (what was done?)"
                  value={completionSummary}
                  onChange={e => setCompletionSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Parts actually used (e.g. 2x SKF bearings)"
                  value={partsUsed}
                  onChange={e => setPartsUsed(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full h-10 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {completing ? 'Submitting…' : 'Submit — Request Consumer Confirmation'}
                </button>
              </div>
            </details>
            <button
              onClick={() => onOpenChat(job.id)}
              className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Open Chat
            </button>
          </div>
        )}

        {/* ── PENDING CONFIRMATION (old flow) ── */}
        {!isDisputed && jobStatus === 'pending_confirmation' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-1 mt-2">
            <p className="text-sm font-bold text-amber-800">⏳ Waiting for Consumer Confirmation</p>
            <p className="text-xs text-amber-600">Payment will be released once they confirm.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ActiveJobsView({ activeJobs, onProgressUpdate, onMarkComplete, onOpenChat, onMarkArrived, onMarkStarted, onMarkDone, isDemo }) {
  if (!activeJobs || activeJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="text-slate-300" size={28} />
        </div>
        <h4 className="text-lg font-semibold text-slate-900 mb-1">No active jobs</h4>
        <p className="text-sm text-slate-500 max-w-xs">
          Accepted service requests will appear here. Accept a request from your Dashboard to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Active Jobs</h2>
        <p className="text-sm text-slate-500 mt-1">{activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} in progress</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeJobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onProgressUpdate={onProgressUpdate}
            onMarkComplete={onMarkComplete}
            onOpenChat={onOpenChat}
            onMarkArrived={onMarkArrived}
            onMarkStarted={onMarkStarted}
            onMarkDone={onMarkDone}
            isDemo={isDemo}
          />
        ))}
      </div>
    </div>
  );
}
