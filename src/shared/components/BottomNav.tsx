import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../features/auth/store/useAuthModalStore';
import { useCartStore } from '../../features/cart/store/useCartStore';

export const BottomNav = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openModal = useAuthModalStore((state) => state.openModal);
  
  const { items } = useCartStore();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const mobileNavigation = [
    { name: 'Home', to: '/', icon: Home, show: true },
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
            className={({ isActive }) => {
              const isItemActive = isActive && item.to !== '#';
              return `flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all duration-300 ${
                isItemActive ? 'text-primary bg-white/5 scale-105' : 'text-secondary-foreground/60 hover:text-white hover:bg-white/5'
              }`;
            }}
          >
            {({ isActive }) => {
              const isItemActive = isActive && item.to !== '#';
              return (
              <>
                <div className="relative">
                  <item.icon className={`size-5 transition-all duration-300 ${isItemActive ? 'drop-shadow-[0_0_8px_rgba(249,148,32,0.5)]' : ''}`} strokeWidth={isItemActive ? 2.5 : 2} />
                  {item.name === 'Cart' && cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[9px] font-extrabold w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-300">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] transition-all duration-300 ${isItemActive ? 'font-extrabold tracking-wide' : 'font-medium'}`}>
                  {item.name}
                </span>
              </>
            )}}
          </NavLink>
        ))}
    </div>
  );
};
