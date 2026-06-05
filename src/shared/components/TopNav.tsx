import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, User, ShoppingBag, Heart, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../features/auth/store/useAuthModalStore';
import { authService } from '../../features/auth/services/authService';
import { useThemeStore } from '../../core/theme/useThemeStore';
import logoImg from '../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';

export const TopNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { openModal } = useAuthModalStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // We need to ensure we don't close it immediately if they click the menu button itself.
        // But for simplicity, we'll just handle it on the button's onClick and a generic overlay if needed.
        // Actually, let's just close it if clicking outside.
        const target = event.target as HTMLElement;
        if (!target.closest('#mobile-menu-button')) {
          setIsMobileMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-8 max-w-[1600px] mx-auto">
        
        {/* Left: Logo & Main Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logoImg} 
              alt="Tulete Logo" 
              width={48}
              height={48}
              className="h-12 w-12 object-contain rounded-md"
            />
            <span className="text-xl font-extrabold tracking-tight text-foreground hidden sm:block">Tulete</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}`}>Home</Link>
            <Link to="/explore" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/explore') ? 'text-foreground' : 'text-muted-foreground'}`}>Explore</Link>
            <Link to="/food" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/food') ? 'text-foreground' : 'text-muted-foreground'}`}>Food</Link>
            <Link to="/laundry" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/laundry') ? 'text-foreground' : 'text-muted-foreground'}`}>Laundry</Link>
            <Link to="/products" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/products') ? 'text-foreground' : 'text-muted-foreground'}`}>Products</Link>
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={toggleTheme}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors hidden sm:block"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          
          {isAuthenticated ? (
            <>
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-10 w-64 rounded-full border border-border bg-muted/50 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                />
              </div>

              <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                <Bell className="size-5" />
                <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-destructive border-2 border-card" />
              </button>

              {/* Removed inner dark toggle */}

              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-center size-9 rounded-full bg-primary/10 border border-primary/20 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                >
                  <span className="text-primary text-sm font-extrabold uppercase">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-56 rounded-2xl bg-card border border-border shadow-xl overflow-hidden py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-border/50 mb-2">
                        <p className="text-sm font-extrabold text-foreground truncate">{user?.displayName || 'User'}</p>
                        <p className="text-xs font-semibold text-muted-foreground truncate">{user?.email}</p>
                      </div>

                      <div className="flex flex-col">
                        <Link onClick={() => setIsDropdownOpen(false)} to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <Link onClick={() => setIsDropdownOpen(false)} to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <ShoppingBag className="w-4 h-4" /> My Orders
                        </Link>
                        <Link onClick={() => setIsDropdownOpen(false)} to="/favorites" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Heart className="w-4 h-4" /> Favorites
                        </Link>
                        <Link onClick={() => setIsDropdownOpen(false)} to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <div className="h-px bg-border/50 my-2 mx-4" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors text-left">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => openModal('login')}
                className="text-xs sm:text-sm font-extrabold hover:underline underline-offset-4 bg-transparent border-none p-0 cursor-pointer text-foreground"
              >
                Sign In
              </button>
              <button 
                onClick={() => openModal('register')}
                className="text-xs sm:text-sm font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all shadow-sm cursor-pointer border-none"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Icon */}
          <button 
            id="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
          >
            <Menu className="size-5" />
          </button>

        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 right-0 border-t border-border bg-card shadow-2xl overflow-hidden z-50"
          >
            <nav className="flex flex-col p-4 gap-2">
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Home</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/explore" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/explore') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Explore</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/food" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/food') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Food</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/laundry" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/laundry') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Laundry</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/products" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/products') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Products</Link>
              
              {!isAuthenticated && (
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-border">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openModal('login');
                    }}
                    className="w-full text-center px-4 py-3 rounded-xl text-sm font-extrabold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openModal('register');
                    }}
                    className="w-full text-center px-4 py-3 rounded-xl text-sm font-extrabold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-border">
                <span className="text-sm font-bold text-muted-foreground">Theme</span>
                <button 
                  onClick={toggleTheme}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                >
                  {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  );
};
