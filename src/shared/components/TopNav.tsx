import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/useAuthStore';

// Simple breadcrumb logic based on pathname
const generateBreadcrumbs = (pathname: string) => {
  const paths = pathname.split('/').filter(Boolean);
  if (paths.length === 0) return 'Dashboard';
  return paths[0].charAt(0).toUpperCase() + paths[0].slice(1);
};

export const TopNav = () => {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-card/80 backdrop-blur-md px-4 md:px-6 border-b border-border shadow-sm">
      {/* Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md">
          <Menu className="size-6" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
          {generateBreadcrumbs(pathname)}
        </h1>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-md border border-border bg-muted/50 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive border border-card" />
        </button>

        <Link to="/profile" className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center border border-border">
            <span className="text-secondary-foreground text-sm font-semibold">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
