import React from 'react';
import { CheckCircle } from 'lucide-react';

function PopupModal({ title = "Support Ticket Submitted", message, onClose }) {
  return (
    <div className="modal-overlay">
      <div
        className="premium-modal animate-fade-in"
        style={{ maxWidth: "400px" }}
      >
        <div className="p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle
              className="w-10 h-10 text-[var(--success)]"
              strokeWidth={3}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <button
            className="main-action-btn h-12 rounded-xl text-[10px]"
            onClick={onClose}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

export default PopupModal;
