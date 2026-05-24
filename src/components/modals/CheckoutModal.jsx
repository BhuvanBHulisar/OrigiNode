import React from "react";
import { X } from "lucide-react";

export default function CheckoutModal({ show, onClose, checkoutDetails, checkoutDesc, onConfirm }) {
  if (!show || !checkoutDetails) return null;

  return (
    <div className="modal-overlay">
      <div
        className="premium-modal"
        style={{
          maxWidth: "480px",
          borderRadius: "16px",
          background: "white",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="modal-header-premium border-b border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
            Payment Summary
          </h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-premium p-6 space-y-4">
          <div className="space-y-3">
            {[
              {
                label: "Service Cost",
                value: `₹${checkoutDetails.providerPrice}`,
              },
              {
                label: "Platform Fee",
                value: `₹${checkoutDetails.commission}`,
              },
              { label: "GST", value: `₹${checkoutDetails.gst}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">{item.label}</span>
                <strong className="text-sm font-semibold text-slate-900">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">
              Total
            </span>
            <span className="text-xl font-bold text-[#0d9488]">
              ₹{checkoutDetails.totalPayable}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              className="secondary-action-btn h-12 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="main-action-btn h-12 rounded-lg bg-[#0d9488]"
              onClick={onConfirm}
            >
              Pay ₹{checkoutDetails.totalPayable}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
