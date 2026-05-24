import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  CreditCard,
  Lock,
  AlertCircle,
  ArrowRight,
  Info as InfoIcon,
} from "lucide-react";
import { cn } from "../ui/base";

export default function CompleteProfileModal({
  show,
  onClose,
  bankDetailsForm,
  setBankDetailsForm,
  bankDetailsErrors,
  setBankDetailsErrors,
  onSave,
  onSkip,
  showPayoutSkipConfirm,
  setShowPayoutSkipConfirm,
  onConfirmSkip,
}) {
  const handleFormatAccountNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 18);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setBankDetailsForm({ ...bankDetailsForm, bankAccountNumber: formatted });
    if (bankDetailsErrors.bankAccountNumber) {
      setBankDetailsErrors((prev) => ({ ...prev, bankAccountNumber: "" }));
    }
  };

  const handleIFSCChange = (value) => {
    const upperValue = value.toUpperCase().slice(0, 11);
    setBankDetailsForm({ ...bankDetailsForm, ifscCode: upperValue });
    if (bankDetailsErrors.ifscCode) {
      setBankDetailsErrors((prev) => ({ ...prev, ifscCode: "" }));
    }
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 font-['Outfit',_sans-serif]"
            >
              {/* Back Button */}
              <button
                onClick={onSkip}
                className="absolute top-8 left-8 p-3 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Header Gradient */}
              <div className="h-2 bg-gradient-to-r from-teal-600 via-indigo-600 to-violet-600" />

              <div className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-indigo-50 text-teal-600 rounded-[1.75rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <CreditCard size={40} strokeWidth={1.5} />
                </div>

                <div className="space-y-3 mb-10">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    Set up payouts (optional)
                  </h2>
                  <p className="text-slate-500 font-semibold text-base">
                    You can complete this later anytime.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mb-10">
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                        <Lock size={10} className="text-slate-300" /> Account Holder Name
                      </label>
                      {bankDetailsErrors.accountHolderName && (
                        <span className="text-[10px] font-bold text-red-500">
                          {bankDetailsErrors.accountHolderName}
                        </span>
                      )}
                    </div>
                    <input
                      className={cn(
                        "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm",
                        bankDetailsErrors.accountHolderName
                          ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                          : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                      )}
                      placeholder="Full name as per bank records"
                      value={bankDetailsForm.accountHolderName}
                      onChange={(e) => {
                        setBankDetailsForm({
                          ...bankDetailsForm,
                          accountHolderName: e.target.value,
                        });
                        if (bankDetailsErrors.accountHolderName)
                          setBankDetailsErrors((p) => ({
                            ...p,
                            accountHolderName: "",
                          }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                        <Lock size={10} className="text-slate-300" /> Account Number
                      </label>
                    </div>
                    <input
                      className={cn(
                        "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm",
                        bankDetailsErrors.bankAccountNumber
                          ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                          : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                      )}
                      placeholder="Enter 9–18 digit account number"
                      value={bankDetailsForm.bankAccountNumber}
                      onChange={(e) =>
                        handleFormatAccountNumber(e.target.value)
                      }
                    />
                    {bankDetailsErrors.bankAccountNumber && (
                      <span className="text-[10px] font-bold text-red-500 ml-1">
                        {bankDetailsErrors.bankAccountNumber}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5">
                        <Lock size={10} className="text-slate-300" /> IFSC Code
                      </label>
                    </div>
                    <input
                      className={cn(
                        "w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm uppercase",
                        bankDetailsErrors.ifscCode
                          ? "border-red-100 focus:border-red-500 focus:ring-red-500/5 bg-red-50/30"
                          : "border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5",
                      )}
                      placeholder="SBIN0001234"
                      value={bankDetailsForm.ifscCode}
                      onChange={(e) => handleIFSCChange(e.target.value)}
                    />
                    {bankDetailsErrors.ifscCode && (
                      <span className="text-[10px] font-bold text-red-500 ml-1">
                        {bankDetailsErrors.ifscCode}
                      </span>
                    )}
                  </div>

                  {bankDetailsErrors.server && (
                    <div className="md:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
                      <AlertCircle size={14} /> {bankDetailsErrors.server}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <button
                    onClick={onSave}
                    disabled={
                      !bankDetailsForm.accountHolderName ||
                      !bankDetailsForm.bankAccountNumber ||
                      !bankDetailsForm.ifscCode
                    }
                    className="group relative w-full h-16 overflow-hidden rounded-2xl bg-slate-900 text-white font-bold text-base shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                      Save Bank Details <ArrowRight size={20} />
                    </span>
                  </button>

                  <button
                    onClick={onSkip}
                    className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayoutSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <InfoIcon size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                Complete later?
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                You can finish setting up payouts anytime from your profile
                settings.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowPayoutSkipConfirm(false)}
                  className="h-12 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Stay
                </button>
                <button
                  onClick={onConfirmSkip}
                  className="h-12 rounded-xl bg-[#0d9488] text-white font-bold text-sm hover:bg-teal-700 transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
