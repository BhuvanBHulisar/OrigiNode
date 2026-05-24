import React from 'react';
import { useNavigate } from 'react-router-dom';

function LegalPage({ title, effectiveDate, sections }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Navbar matching landing page */}
      <nav className="nav-sticky scrolled bg-white/80 backdrop-blur-md sticky top-0 z-[1000] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="logo-container flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="logo-text text-2xl font-extrabold tracking-tight">IndEase</div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </nav>

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[860px]">
          <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),_0_1px_2px_0_rgba(0,0,0,0.03)] sm:p-12">
            
            {/* Page Header */}
            <div className="mb-10 text-left">
              <h1 className="text-[28px] font-bold text-[#111827] leading-tight mb-2">{title}</h1>
              <p className="text-sm font-semibold text-[#6B7280]">Last updated: March 2026</p>
              {effectiveDate && (
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">Effective date: {effectiveDate}</p>
              )}
            </div>

            {/* Table of Contents */}
            <div className="mb-12 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Table of Contents</h3>
              <div className="grid grid-cols-1 gap-y-3 gap-x-6 sm:grid-cols-2">
                {sections.map((section, idx) => (
                  <a 
                    key={idx} 
                    href={`#section-${idx}`}
                    className="text-[14px] font-semibold text-teal-600 transition-colors hover:text-teal-700"
                  >
                    {section.heading}
                  </a>
                ))}
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-12">
              {sections.map((section, idx) => (
                <section key={idx} id={`section-${idx}`} className="space-y-4 scroll-mt-24">
                  <h2 className="text-[18px] font-semibold text-[#0d9488]">{section.heading}</h2>
                  <div className="space-y-4">
                    {section.body.map((item, bodyIdx) => (
                      <p key={bodyIdx} className="text-[15px] leading-[1.8] text-[#374151] font-medium">
                        {item}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer matching landing page */}
      <footer className="footer-simple py-12 border-t border-slate-200 bg-[#F1F5F9]/30">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="logo-container inline-flex items-center justify-center cursor-pointer" onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <div className="logo-text text-xl font-extrabold tracking-tight">IndEase</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-slate-600">
            <button type="button" onClick={() => { navigate('/terms'); window.scrollTo(0,0); }} className="transition-colors hover:text-teal-600">
              Terms & Conditions
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={() => { navigate('/privacy'); window.scrollTo(0,0); }} className="transition-colors hover:text-teal-600">
              Privacy Policy
            </button>
            <span className="text-slate-300">|</span>
            <a href="mailto:support@indease.com" className="transition-colors hover:text-teal-600">
              Contact Us
            </a>
          </div>
          <p className="text-xs font-semibold text-slate-400">© 2026 IndEase Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LegalPage;
