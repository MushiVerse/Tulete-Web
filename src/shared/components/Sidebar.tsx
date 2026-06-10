import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, LayoutDashboard, Heart, MessageSquare, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../core/auth/useAuthStore';
import logoImg from '../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';

const navigation = [

  { name: 'Orders', to: '/orders', icon: ShoppingBag },
  { name: 'Cart', to: '/cart', icon: ShoppingBag }, // Usually in top nav, but kept here for completeness
  { name: 'Favorites', to: '/favorites', icon: Heart },
  { name: 'Messages', to: '/messages', icon: MessageSquare },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border min-h-screen shadow-sm">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <img 
          src={logoImg} 
          alt="Tulete Logo" 
          width={48}
          height={48}
          className="h-12 w-12 object-contain rounded-md"
        />
        <span className="text-xl font-bold text-primary tracking-tight">Tulete</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
              }`
            }
          >
            <item.icon className="size-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-red-50 transition-colors"
        >
          <LogOut className="size-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
