import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const DashboardLayout = ({ children, user, notifications, activeTab, setActiveTab, onLogout, onClearData, onClearNotifs, role, onMarkAsRead, onMarkAllRead, socketReconnecting, onSearch, searchResults, onSearchResultClick, isDemo, activeJobsCount = 0, activeRequestsCount = 0, newRequestsCount = 0 }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        onLogout={onLogout}
        onClearData={onClearData}
        isDemo={isDemo}
        user={user}
        role={role}
        activeJobsCount={activeJobsCount}
        activeRequestsCount={activeRequestsCount}
        newRequestsCount={newRequestsCount}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          user={user}
          notifications={notifications}
          role={role}
          onMarkAsRead={onMarkAsRead}
          onMarkAllRead={onMarkAllRead}
          onClearNotifs={onClearNotifs}
          isDemo={isDemo}
          onMenuClick={() => setSidebarOpen(true)}
          setActiveTab={setActiveTab}
          onLogout={onLogout}
        />
        
        <main className="flex-1 overflow-y-auto bg-slate-50 relative custom-scrollbar">
          {socketReconnecting ? (
            <div className="sticky top-0 z-50 px-4 py-1.5 text-center text-xs bg-amber-50 text-amber-800 border-b border-amber-100" role="status">
              Reconnecting...
            </div>
          ) : null}
          {isDemo && (
            <div className="sticky top-0 z-40 px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-4 text-sm">
              <span className="text-amber-800 font-medium">
                🚧 You are using a simulated environment. Data will not affect real users.
              </span>
              <a href="/consumer/signup" className="shrink-0 text-xs font-bold text-amber-900 underline hover:text-amber-700">
                Create Account →
              </a>
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-12 max-w-[1600px] mx-auto w-full animate-fade-in">
            {children}
          </div>
          {/* Dashboard Footer */}
          <div className="px-8 lg:px-12 pb-8 max-w-[1600px] mx-auto w-full">
            <div className="pt-6 border-t border-slate-200/60 text-center">
              <p className="text-xs text-slate-400 font-medium">
                Need help? Contact us at{' '}
                <a href="mailto:support@indease.com" className="text-teal-500 hover:underline font-bold">
                  IndEase Support
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
