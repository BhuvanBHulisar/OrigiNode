import React from 'react';

function ReportField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <p className="text-sm font-black text-slate-900 tracking-tight">
        {value}
      </p>
    </div>
  );
}

export default ReportField;
