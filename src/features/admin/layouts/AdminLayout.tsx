import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Search, ShoppingBag, ShoppingCart, Activity, LogOut, 
  ShieldCheck, Menu, X, ExternalLink, ChevronRight, Sun, Moon, Sparkles, XCircle
} from 'lucide-react';
import { adminAuthService } from '../services/adminAuthService';
import { auth } from '../../../core/firebase/config';
import { AdminThemeProvider, useAdminTheme } from '../context/AdminThemeContext';
import { AdminLogo } from '../components/AdminLogo';
import pkg from '../../../../package.json';

const AdminLayoutContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();
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
      title: 'Orders Management',
      path: '/admin/orders',
      icon: ShoppingBag,
      desc: 'Online & POS Laundry office orders',
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
      title: 'Abandoned Carts',
      path: '/admin/abandoned-carts',
      icon: ShoppingCart,
      desc: 'Uncheckout carts & revenue recovery',
    },
    {
      title: 'Cancelled Orders',
      path: '/admin/cancellations',
      icon: XCircle,
      desc: 'Canceled order previews & user/store details',
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

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <header className={`h-16 border-b sticky top-0 z-40 px-3 sm:px-4 lg:px-8 flex items-center justify-between shrink-0 transition-colors ${
        isDark 
          ? 'border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl' 
          : 'border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xs'
      }`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-xl border transition-all shrink-0 ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0" onClick={() => navigate('/admin')}>
            <AdminLogo size="md" isDark={isDark} showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`font-black text-sm sm:text-base tracking-tight truncate text-[#e89a3c]`}>
                  Tulete Web Admin
                </span>
                <span className="hidden xs:inline-block px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full shrink-0">
                  v{pkg.version || '2.5.0'}
                </span>
              </div>
              <p className={`hidden sm:block text-[11px] font-medium truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Tulete Intelligent Platform Analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
              isDark 
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-amber-400' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-xs'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="hidden md:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Live Status indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Syncing</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isDark 
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-white' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
            title="Go to main web app"
          >
            <span>Customer Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className={`h-6 w-[1px] hidden sm:block ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          {/* User profile pill & logout */}
          <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
            <div className="text-right hidden xl:block">
              <p className={`text-xs font-extrabold truncate max-w-[140px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
                Admin
              </p>
            </div>

            <button
              onClick={handleLogout}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-rose-500/20 hover:text-rose-400 border-zinc-700/60 text-zinc-300' 
                  : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border-slate-200 text-slate-700'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className={`hidden lg:flex flex-col w-64 border-r p-4 shrink-0 justify-between transition-colors ${
          isDark 
            ? 'border-zinc-800/80 bg-zinc-900/40' 
            : 'border-slate-200 bg-white'
        }`}>
          <div className="space-y-1.5 pt-2">
            <p className={`px-3 text-[11px] font-black uppercase tracking-wider mb-3 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>
              Admin Intelligence Menu
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
                        : isDark
                          ? 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {({ isActive: linkActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-5 h-5 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold leading-none">{item.title}</p>
                          <p className={`text-[10px] mt-1 truncate ${
                            linkActive
                              ? 'text-white/95 font-semibold'
                              : isDark
                                ? 'text-zinc-400 group-hover:text-zinc-300'
                                : 'text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-opacity ${
                        linkActive ? 'opacity-100 text-white' : 'opacity-40 group-hover:opacity-100'
                      }`} />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className={`p-4 rounded-2xl border ${
              isDark 
                ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800/80' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-500 mb-1">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Tulete Engine</span>
              </div>
              <p className={`text-[11px] font-medium leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Analytics metrics are dynamically updated from customer actions in Firestore.
              </p>
            </div>

            <div className="w-full">
              <span className="w-full flex items-center justify-center py-2 px-3 text-xs font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded-xl shadow-xs text-center">
                Admin v{pkg.version || '2.5.0'}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
            <div className={`w-72 border-r p-4 flex flex-col justify-between h-full animate-in slide-in-from-left duration-200 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-4">
                <div className={`flex items-center justify-between pb-4 border-b ${
                  isDark ? 'border-zinc-800' : 'border-slate-200'
                }`}>
                  <span className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Navigation</span>
                  <button onClick={() => setMobileOpen(false)} className="p-2 text-zinc-400 hover:text-white">
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
                        className={({ isActive: linkActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                            linkActive
                              ? 'bg-primary text-white border-primary shadow-md'
                              : isDark 
                                ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`
                        }
                      >
                        {({ isActive: linkActive }) => (
                          <>
                            <Icon className="w-5 h-5 shrink-0" />
                            <div className="truncate">
                              <p className="font-bold leading-none">{item.title}</p>
                              <p className={`text-[10px] mt-1 truncate ${
                                linkActive ? 'text-white/95 font-semibold' : 'text-zinc-400'
                              }`}>
                                {item.desc}
                              </p>
                            </div>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 space-y-3">
                {/* Mobile Drawer Tulete Engine Card */}
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  isDark 
                    ? 'bg-zinc-950/80 border-zinc-800' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-500">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Tulete Engine</span>
                  </div>
                  <p className={`text-[11px] font-medium leading-normal ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>
                    Intelligent Platform Analytics & telemetry system.
                  </p>
                </div>

                {/* Full-width Version Code below Tulete Engine Card */}
                <div className="w-full">
                  <span className="w-full flex items-center justify-center py-2 px-3 text-xs font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded-xl shadow-xs text-center">
                    Admin v{pkg.version || '2.5.0'}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full h-11 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out Admin</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main Dashboard Content View */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors ${
          isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AdminLayout: React.FC = () => (
  <AdminThemeProvider>
    <AdminLayoutContent />
  </AdminThemeProvider>
);
