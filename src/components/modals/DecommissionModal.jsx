import React from "react";
import { AlertCircle } from "lucide-react";

export default function DecommissionModal({ nodeToDelete, onClose, onConfirm }) {
  if (!nodeToDelete) return null;

  return (
    <div className="modal-overlay">
      <div className="premium-modal" style={{ maxWidth: "440px" }}>
        <div className="p-12 text-center space-y-8">
          <div className="w-20 h-20 bg-[var(--warning)] border border-amber-100 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle
              className="w-10 h-10 text-[var(--warning)]"
              strokeWidth={2.5}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Decommission
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Are you sure you want to remove{" "}
              <strong>{nodeToDelete.name}</strong> from your active fleet?
            </p>
          </div>
          <div className="space-y-4">
            <button
              className="main-action-btn h-14 rounded-2xl bg-slate-900"
              onClick={onConfirm}
            >
              Confirm Removal
            </button>
            <button
              className="secondary-action-btn h-14 border-none text-slate-400"
              onClick={onClose}
            >
              Abor Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
