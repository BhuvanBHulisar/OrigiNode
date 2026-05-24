import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, UserCircle, Sparkles, AlertCircle, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/base';

const Topbar = ({ user, notifications = [], role, onMarkAsRead, onMarkAllRead, onClearNotifs, isDemo, onMenuClick, setActiveTab, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showAllNotif, setShowAllNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((currentTime - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} mins ago`;
    const hours = Math.floor(diff / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const profileMenuRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  const firstName = user?.firstName || 'User';
  const initial = firstName.charAt(0).toUpperCase();
  const isExpert = role === 'producer';
  const primaryColor = isExpert ? 'indigo-600' : '[#0d9488]';
  const primaryText = isExpert ? 'text-indigo-600' : 'text-[#0d9488]';

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      const clickedButton = profileRef.current && profileRef.current.contains(e.target);
      const clickedMenu = profileMenuRef.current && profileMenuRef.current.contains(e.target);
      if (!clickedButton && !clickedMenu) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleProfileNav = (tab) => {
    setActiveTab?.(tab);
    setShowProfile(false);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setShowProfile(false);
      onLogout?.();
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 lg:px-10 sticky top-0 z-[50]">
      <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 focus:outline-none rounded-lg hover:bg-slate-50"
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 ml-2 shrink-0">
        {/* Demo Mode Badge */}
        {isDemo && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Demo Mode</span>
          </div>
        )}
        {/* Support Sparkle */}
        <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all group">
           <Sparkles size={14} />
           <span className="text-[10px] font-semibold uppercase tracking-widest">Support</span>
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              if (!showNotif && onMarkAllRead) onMarkAllRead();
              setShowNotif(!showNotif);
            }}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all relative group",
              showNotif ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border border-white text-[9px] font-bold text-white flex items-center justify-center pointer-events-none" aria-hidden="true">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotif && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden z-50"
              >
                 <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-[11px] font-semibold text-slate-500 tracking-widest">Notifications</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onMarkAllRead && onMarkAllRead()}
                        className="text-[10px] text-[#0d9488] font-semibold hover:underline"
                      >
                        Mark all read
                      </button>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => { onClearNotifs && onClearNotifs(); }}
                          className="text-[10px] text-red-500 font-semibold hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                 </div>
                 
                 <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n, i) => (
                         <div 
                           key={n.id || i} 
                           onClick={() => onMarkAsRead && onMarkAsRead(n.id)}
                           className={`px-5 py-4 border-b border-[#E5E7EB] hover:bg-slate-50 transition-all cursor-pointer group flex gap-3 relative ${!n.read ? 'bg-teal-50/30' : ''}`}
                         >
                            {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-600" />}
                            <div className={`w-8 h-8 rounded-lg ${isExpert ? 'bg-indigo-50' : 'bg-teal-50'} flex items-center justify-center shrink-0`}>
                               <AlertCircle size={16} className={primaryText} />
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1">
                               <p className="text-xs text-slate-700 font-bold leading-tight tracking-tight">{n.title || 'Notification'}</p>
                               <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{n.message || n.msg || ''}</p>
                               <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{getTimeAgo(n.timestamp)}</p>
                            </div>
                         </div>
                      ))
                    ) : (
                      <div className="p-10 text-center text-slate-500 text-xs">
                        No notifications
                      </div>
                    )}
                 </div>
                 {notifications.length > 0 && (
                    <div className="p-3 border-t border-[#E5E7EB] text-center bg-slate-50">
                       <button 
                         onClick={() => { setShowAllNotif(true); setShowNotif(false); }}
                         className="text-[11px] text-slate-500 hover:text-teal-600 font-semibold uppercase tracking-widest"
                       >
                         View All Notifications →
                       </button>
                    </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Identity Segment */}
        <div className="relative">
          <button
            ref={profileRef}
            aria-label={`Account menu for ${firstName}`}
            onClick={() => setShowProfile(s => !s)}
            className="flex items-center gap-2 lg:gap-3 pl-3 sm:pl-4 lg:pl-6 border-l border-[#E5E7EB] h-10 group shrink-0"
          >
            <div className={`w-8 h-8 rounded-lg bg-${isExpert ? 'indigo-600' : '[#0d9488]'} flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm`}>
              {initial}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-sm font-bold text-slate-900 leading-none tracking-tight">{firstName}</span>
              <span className={`text-[10px] font-bold ${isExpert ? 'text-indigo-600' : 'text-[#0d9488]'} uppercase tracking-widest mt-1.5`}>{isExpert ? 'Service Expert' : 'Fleet Operator'}</span>
            </div>
            <ChevronDown size={14} className={cn(
              "hidden sm:block text-slate-400 group-hover:text-slate-900 transition-all",
              showProfile ? "rotate-180 text-slate-900" : ""
            )} />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                ref={profileMenuRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => handleProfileNav('profile')}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                >
                  <UserCircle size={16} className="text-slate-400" />
                  My Profile
                </button>
                <button
                  onClick={() => handleProfileNav('settings')}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                >
                  <Settings size={16} className="text-slate-400" />
                  Settings
                </button>
                <div className="border-t border-[#E5E7EB]" />
                <button
                  onClick={handleLogoutClick}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-sm font-semibold text-red-600"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* PROMPT 4 — View All Notifications Slide-over Panel */}
      {showAllNotif && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowAllNotif(false)}
            style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:200}}
          />
          {/* Panel */}
          <div style={{
            position:'fixed', top:0, right:0, height:'100vh',
            width:'420px', background:'white', zIndex:201,
            boxShadow:'-4px 0 24px rgba(0,0,0,0.12)',
            display:'flex', flexDirection:'column'
          }}>
            {/* Header */}
            <div style={{
              padding:'20px 24px', borderBottom:'1px solid #F1F5F9',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <div>
                <h2 style={{fontSize:'16px', fontWeight:700, color:'#0f172a', margin:0}}>Notifications</h2>
                <p style={{fontSize:'12px', color:'#94a3b8', margin:'2px 0 0'}}>
                  {notifications.filter(n => !n.read).length} unread
                </p>
              </div>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <button
                  onClick={onMarkAllRead}
                  style={{fontSize:'12px', color:'#0d9488', fontWeight:600, background:'none', border:'none', cursor:'pointer'}}
                >
                  Mark all read
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={() => { onClearNotifs && onClearNotifs(); }}
                    style={{fontSize:'12px', color:'#ef4444', fontWeight:600, background:'none', border:'none', cursor:'pointer'}}
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setShowAllNotif(false)}
                  style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'20px', lineHeight:1}}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{flex:1, overflowY:'auto', padding:'8px 0'}}>
              {notifications.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 24px', color:'#94a3b8'}}>
                  <div style={{fontSize:'32px', marginBottom:'12px'}}>🔔</div>
                  <p style={{fontSize:'14px', fontWeight:500}}>No notifications yet</p>
                  <p style={{fontSize:'12px', marginTop:'4px'}}>You will be notified about service updates, messages, and payments.</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    onClick={() => onMarkAsRead && onMarkAsRead(n.id)}
                    style={{
                      padding:'14px 24px',
                      borderBottom:'1px solid #F8FAFC',
                      background: n.read ? 'white' : '#F0FDFA',
                      cursor:'pointer',
                      transition:'background 0.15s',
                      display:'flex', gap:'12px', alignItems:'flex-start'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                      background: n.read ? '#F1F5F9' : '#CCFBF1',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'16px'
                    }}>
                      {n.type === 'payment' ? '💳'
                        : n.type === 'message' ? '💬'
                        : n.type === 'new_request' ? '🔧'
                        : n.type === 'achievement' ? '⭐'
                        : n.type === 'system' ? '⚙️'
                        : '🔔'}
                    </div>
                    {/* Content */}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{
                        fontSize:'13px', fontWeight: n.read ? 500 : 700,
                        color:'#0f172a', marginBottom:'3px'
                      }}>
                        {n.title || 'Notification'}
                      </div>
                      <div style={{
                        fontSize:'12px', color:'#64748b', lineHeight:'1.5',
                        wordBreak:'break-word'
                      }}>
                        {n.message || n.msg || ''}
                      </div>
                      <div style={{fontSize:'11px', color:'#94a3b8', marginTop:'4px'}}>
                        {getTimeAgo(n.timestamp)}
                      </div>
                    </div>
                    {/* Unread dot */}
                    {!n.read && (
                      <div style={{
                        width:'8px', height:'8px', borderRadius:'50%',
                        background:'#0d9488', flexShrink:0, marginTop:'4px'
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{padding:'16px 24px', borderTop:'1px solid #F1F5F9', background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <p style={{fontSize:'11px', color:'#94a3b8', margin:0}}>Stored for 30 days</p>
              {notifications.length > 0 && (
                <button
                  onClick={() => { onClearNotifs && onClearNotifs(); setShowAllNotif(false); }}
                  style={{
                    fontSize:'12px', color:'#ef4444', fontWeight:600,
                    background:'none', border:'1px solid #fecaca',
                    borderRadius:'8px', padding:'6px 14px', cursor:'pointer'
                  }}
                >
                  🗑 Clear All
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Topbar;
