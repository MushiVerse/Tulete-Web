import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../features/auth/store/useAuthModalStore';

export const BottomNav = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openModal = useAuthModalStore((state) => state.openModal);

  const mobileNavigation = [
    { name: 'Home', to: '/', icon: Home, show: !isAuthenticated },
    { name: 'Dash', to: '/dashboard', icon: LayoutDashboard, show: isAuthenticated },
    { name: 'Search', to: '/explore', icon: Search, show: true },
    { name: 'Cart', to: '/cart', icon: ShoppingCart, show: true },
    { 
      name: 'Profile', 
      to: isAuthenticated ? '/profile' : '#', 
      icon: User, 
      onClick: isAuthenticated ? undefined : (e: React.MouseEvent) => {
        e.preventDefault();
        openModal('login');
      },
      show: true 
    },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-secondary/95 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-around z-50 shadow-2xl shadow-secondary/30 px-2">
      {mobileNavigation
        .filter((item) => item.show)
        .map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            onClick={item.onClick}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all duration-300 ${
                isActive ? 'text-primary bg-white/5 scale-105' : 'text-secondary-foreground/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`size-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(249,148,32,0.5)]' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-extrabold tracking-wide' : 'font-medium'}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
    </div>
  );
};
