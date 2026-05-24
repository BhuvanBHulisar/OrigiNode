import React from "react";
import { Star } from "lucide-react";

export default function PostPaymentRatingModal({
  show,
  onClose,
  postPaymentRatingContext,
  reviewData,
  setReviewData,
  onSubmit,
}) {
  if (!show || !postPaymentRatingContext) return null;

  return (
    <div className="modal-overlay">
      <div
        className="premium-modal animate-fade-in"
        style={{
          maxWidth: "440px",
          borderRadius: "16px",
          background: "white",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-5">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Rate Your Experience
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              How was the service by{" "}
              <span className="font-semibold text-slate-900">
                {postPaymentRatingContext.expertName}
              </span>
              ?
            </p>
            {postPaymentRatingContext.amountPaid != null && (
              <p className="text-xs text-slate-500 pt-1">
                Payment of ₹{postPaymentRatingContext.amountPaid} completed
                {postPaymentRatingContext.refId ? (
                  <span className="block font-mono text-[11px] mt-1 text-slate-400">
                    Ref: {postPaymentRatingContext.refId}
                  </span>
                ) : null}
              </p>
            )}
          </div>

          <div className="flex justify-center gap-1 py-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setReviewData((prev) => ({ ...prev, rating: i }))
                }
                className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-200"
                aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    i <= reviewData.rating
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-300"
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Leave a comment (optional)
            </label>
            <textarea
              value={reviewData.comment}
              onChange={(e) =>
                setReviewData((prev) => ({
                  ...prev,
                  comment: e.target.value,
                }))
              }
              placeholder="Share your experience (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={reviewData.rating < 1}
              className="flex-1 h-11 rounded-xl bg-[#0d9488] text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
