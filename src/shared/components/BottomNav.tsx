import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../core/auth/useAuthStore';

export const BottomNav = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const mobileNavigation = [
    { name: 'Home', to: '/', icon: Home, show: !isAuthenticated },
    { name: 'Dash', to: '/dashboard', icon: LayoutDashboard, show: isAuthenticated },
    { name: 'Search', to: '/explore', icon: Search, show: true },
    { name: 'Cart', to: '/cart', icon: ShoppingCart, show: true },
    { name: 'Profile', to: isAuthenticated ? '/profile' : '/login', icon: User, show: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {mobileNavigation
        .filter((item) => item.show)
        .map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`size-6 ${isActive ? 'fill-secondary/20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
    </div>
  );
};
