import React from "react";
import { Trash2 } from "lucide-react";

export default function DeleteAccountModal({ show, onClose, email, onConfirm }) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="premium-modal" style={{ maxWidth: "440px" }}>
        <div className="p-12 text-center space-y-8">
          <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm">
            <Trash2
              className="w-10 h-10 text-[var(--danger)]"
              strokeWidth={2.5}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-red-950 tracking-tight">
              Identity Purge
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              This will permanently wipe all machine nodes and historical
              records associated with <strong>{email}</strong>.
            </p>
          </div>
          <div className="space-y-4">
            <button
              className="main-action-btn h-14 rounded-2xl bg-[var(--danger)] text-white"
              onClick={onConfirm}
            >
              Yes, Execute Purge
            </button>
            <button
              className="secondary-action-btn h-14 border-none text-slate-400"
              onClick={onClose}
            >
              Cancel Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
