import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Search, ShoppingBag, Activity, LogOut, 
  ShieldCheck, Menu, X, ExternalLink, ChevronRight, Bell, Sparkles
} from 'lucide-react';
import { adminAuthService } from '../services/adminAuthService';
import { auth } from '../../../core/firebase/config';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentUser = auth.currentUser;

  const navItems = [
    {
      title: 'Overview',
      path: '/admin',
      exact: true,
      icon: LayoutDashboard,
      desc: 'KPI metrics & traffic summary',
    },
    {
      title: 'Search Intelligence',
      path: '/admin/searches',
      icon: Search,
      desc: 'Keywords frequency & conversions',
    },
    {
      title: 'Item Performance',
      path: '/admin/items',
      icon: ShoppingBag,
      desc: 'Most viewed & top ordered items',
    },
    {
      title: 'Live Customer Stream',
      path: '/admin/activity',
      icon: Activity,
      desc: 'Real-time user event timeline',
    },
  ];

  const handleLogout = async () => {
    await adminAuthService.logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 p-0.5 shadow-md shadow-primary/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">Tulete Admin</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-primary/20 text-primary border border-primary/30 rounded-full">
                  CMS v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Intelligent Platform Analytics</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Status indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Firestore Sync</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
            title="Go to main web app"
          >
            <span>Customer Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

          {/* User profile pill */}
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden md:block">
              <p className="text-xs font-extrabold text-white truncate max-w-[160px]">
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                UsersandRoles Admin
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700/60 text-slate-300 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 shrink-0 justify-between">
          <div className="space-y-1.5 pt-2">
            <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
              CMS Intelligence Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? location.pathname === item.path 
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive: linkActive }) =>
                    `flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all border group ${
                      linkActive
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 font-bold'
                        : 'bg-slate-900/50 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold leading-none">{item.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 group-hover:text-slate-300 mt-1 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                </NavLink>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Real-Time Insight Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Analytics metrics are dynamically updated from customer actions in Firestore.
            </p>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
            <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between h-full animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="font-extrabold text-sm text-white">Navigation</span>
                  <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`
                        }
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full h-11 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-extrabold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Admin</span>
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main Dashboard Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
