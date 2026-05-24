import React from 'react';
import { 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Award, 
  MapPin as LocationIcon, 
  ClipboardList as AssignmentIcon 
} from 'lucide-react';

function ExpertProfileModal({ show, onClose, selectedExpert, cn }) {
  if (!show || !selectedExpert) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target.className === "modal-overlay" &&
        onClose()
      }
    >
      <div
        className="premium-modal relative"
        style={{
          width: "100%",
          maxWidth: "480px",
          borderRadius: "16px",
          background: "white",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Loading State */}
        {selectedExpert.loading && (
          <div className="p-8 text-center space-y-6">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-200 rounded-full mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-6"></div>
              <div className="w-full grid grid-cols-2 gap-4">
                <div className="h-20 bg-slate-200 rounded-2xl"></div>
                <div className="h-20 bg-slate-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!selectedExpert.loading && selectedExpert.error && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Profile Error
            </h3>
            <p className="text-slate-500 text-sm">
              Could not load profile. Please try again.
            </p>
            <button
              className="mt-6 w-full h-12 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all font-medium"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {/* Success State */}
        {!selectedExpert.loading && !selectedExpert.error && (
          <>
            <div className="modal-header-premium p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Expert Profile
              </h3>
              <button
                className="modal-close-btn"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-premium p-6 text-center space-y-6">
              {/* Top Section */}
              <div className="relative mx-auto w-24 h-24">
                <div className="w-24 h-24 rounded-full bg-[#0d9488] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-teal-500/20">
                  {selectedExpert.avatar}
                </div>
                <div
                  className={`absolute bottom-1 right-1 w-6 h-6 border-4 border-white rounded-full ${selectedExpert.online ? "bg-emerald-500" : "bg-slate-300"}`}
                />
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {selectedExpert.name}
                </h4>
                <p className="text-sm font-medium text-slate-500">
                  {selectedExpert.specialization}
                </p>

                {/* Badges Section */}
                <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-600 text-xs font-bold tracking-tight">
                    <ShieldCheck size={14} />
                    {selectedExpert.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold tracking-tight">
                    ★ {selectedExpert.rating}
                  </span>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-6">
                <div className="col-span-2 bg-slate-50 p-4 rounded-2xl mb-2 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Reputation Level
                    </p>
                    <p
                      className={cn(
                        "text-base font-black uppercase tracking-tight",
                        selectedExpert.level === "Elite"
                          ? "text-purple-600"
                          : selectedExpert.level === "Gold"
                            ? "text-amber-600"
                            : selectedExpert.level === "Silver"
                              ? "text-emerald-600"
                              : selectedExpert.level === "Bronze"
                                ? "text-teal-600"
                                : "text-slate-500",
                      )}
                    >
                      {selectedExpert.level} Tier
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                    <Award
                      size={20}
                      className={cn(
                        selectedExpert.level === "Elite"
                          ? "text-purple-600"
                          : "text-slate-400",
                      )}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Machine Types
                  </p>
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                    {selectedExpert.machines}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Service City
                  </p>
                  <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-1">
                    <LocationIcon size={14} className="text-slate-400" />{" "}
                    {selectedExpert.city}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Experience
                  </p>
                  <p className="text-[13px] font-semibold text-slate-900">
                    {selectedExpert.experience} Years
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Success Rate
                  </p>
                  <p className="text-[13px] font-semibold text-emerald-600">
                    98% Verified
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Member Since
                  </p>
                  <p className="text-[13px] font-semibold text-slate-900">
                    {selectedExpert.memberSince}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Typical Speed
                  </p>
                  <p className="text-[13px] font-semibold text-teal-600">
                    {selectedExpert.responseTime}
                  </p>
                </div>
              </div>

              <div className="text-left bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                    Technical Qualification
                  </p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 italic">
                    <AssignmentIcon size={14} className="text-indigo-500" />{" "}
                    {selectedExpert.qualification}
                  </p>
                </div>
                <div className="pt-2 border-t border-indigo-100/50 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <p className="text-[11px] font-bold text-slate-500">
                    This expert is verified by IndEase and has completed{" "}
                    {selectedExpert.jobsCompleted} jobs.
                  </p>
                </div>
              </div>

              {/* Bottom / Close */}
              <div className="pt-2">
                <button
                  className="w-full h-12 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all font-medium active:scale-95"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExpertProfileModal;
