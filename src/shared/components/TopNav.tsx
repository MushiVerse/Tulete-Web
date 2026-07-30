import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, User, ShoppingBag, Heart, Settings, LogOut, Sun, Moon, Globe } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../features/auth/store/useAuthModalStore';
import { authService } from '../../features/auth/services/authService';
import { useThemeStore } from '../../core/theme/useThemeStore';
import { useLanguageStore } from '../../core/i18n/useLanguageStore';
import logoImg from '../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';
import { APP_SETTINGS } from '../../core/config/settings';
import { useDeviceOS } from '../../core/hooks/useDeviceOS';
import { useLocationStore } from '../../features/location/store/useLocationStore';
import { MapPin } from 'lucide-react';
import { LanguageCurrencySelector } from './LanguageCurrencySelector';

/** Official Google Play badge from Google's CDN */
const PlayStoreBadge = ({ className = '' }: { className?: string }) => (
  <img
    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
    alt="Get it on Google Play"
    className={className}
    draggable={false}
  />
);

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
  const { language, toggleLanguage, t } = useLanguageStore();
  const { showPlayBadge } = useDeviceOS();
  const { currentLocation, setPickerOpen } = useLocationStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
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
            <span className="notranslate text-xl font-extrabold tracking-tight text-foreground hidden sm:block" translate="no">Tulete</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}`}>{t('home')}</Link>
            <Link to="/explore" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/explore') ? 'text-foreground' : 'text-muted-foreground'}`}>{t('explore')}</Link>
            <Link to="/food" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/food') ? 'text-foreground' : 'text-muted-foreground'}`}>{t('food')}</Link>
            <Link to="/laundry" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/laundry') ? 'text-foreground' : 'text-muted-foreground'}`}>{t('laundry')}</Link>
            <Link to="/products" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/products') ? 'text-foreground' : 'text-muted-foreground'}`}>{t('products')}</Link>
            <Link to="/stores" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/stores') ? 'text-foreground' : 'text-muted-foreground'}`}>Providers</Link>
            <Link to="/orders" className={`text-sm font-bold transition-colors hover:text-foreground ${pathname.startsWith('/orders') ? 'text-foreground' : 'text-muted-foreground'}`}>My Orders</Link>
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 md:gap-5">

          {/* Google Play Badge — compact on mobile (Android only) */}
          {showPlayBadge && (
            <a
              href={APP_SETTINGS.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lg:hidden flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              title="Download on Google Play"
            >
              <PlayStoreBadge className="h-9 w-auto object-contain" />
            </a>
          )}

          {/* Google Play Badge — full size on desktop */}
          {showPlayBadge && (
            <a
              href={APP_SETTINGS.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center active:scale-95 transition-transform hover:-translate-y-0.5 duration-200"
              title="Download on Google Play"
            >
              <PlayStoreBadge className="h-10 w-auto object-contain" />
            </a>
          )}

          {/* Current Location Display / Trigger */}
          <button
            onClick={() => setPickerOpen(true)}
            className="hidden md:flex items-center gap-2 max-w-[200px] px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer group"
            title={currentLocation ? (currentLocation.specificInstructions?.trim() || currentLocation.address) : 'Set Location'}
          >
            <MapPin className="w-4 h-4 shrink-0 group-hover:animate-bounce" />
            <span className="notranslate text-xs font-bold truncate" translate="no">
              {currentLocation
                ? (currentLocation.specificInstructions?.trim() ||
                    (!currentLocation.address.includes('(Default)')
                      ? currentLocation.address.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '').split(',')[0]
                      : 'Set Location'))
                : 'Set Location'}
            </span>
          </button>

          {/* Language & Currency Selector */}
          <LanguageCurrencySelector />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors hidden sm:block"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {/* Favorites */}
          <Link
            to="/favorites"
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors hidden sm:block"
            title="Favorites"
          >
            <Heart className="size-5" />
          </Link>

          {/* Cart Icon / Counter */}
          <Link
            to="/cart"
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            title="Cart"
          >
            <ShoppingBag className="size-5" />
          </Link>

          {/* User Menu / Sign In */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted transition-colors border border-border cursor-pointer"
              >
                <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="size-4" />}
                </div>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-extrabold text-foreground truncate">{user?.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="size-4" /> Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ShoppingBag className="size-4" /> My Orders
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="size-4" /> Settings
                      </Link>
                    </div>

                    <div className="border-t border-border pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="size-4" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <Menu className="size-6" />
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
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/stores" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/stores') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Providers</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} to="/orders" className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname.startsWith('/orders') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>My Orders</Link>

              {!isAuthenticated && (
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-border">
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); openModal('login'); }}
                    className="w-full text-center px-4 py-3 rounded-xl text-sm font-extrabold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); openModal('register'); }}
                    className="w-full text-center px-4 py-3 rounded-xl text-sm font-extrabold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              )}

              {/* Current Location Display / Trigger for Mobile */}
              <button
                onClick={() => { setIsMobileMenuOpen(false); setPickerOpen(true); }}
                className="w-full mt-2 flex items-center justify-between px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col items-start truncate">
                    <span className="text-xs font-semibold text-primary/70">Delivering to</span>
                    <span className="text-sm font-bold truncate max-w-[200px]">
                      {currentLocation
                        ? (currentLocation.specificInstructions?.trim() ||
                            (!currentLocation.address.includes('(Default)')
                              ? currentLocation.address.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '')
                              : 'Set Location'))
                        : 'Set Location'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md">Change</span>
              </button>

              {/* Google Play badge in mobile menu — Android only */}
              {showPlayBadge && (
                <div className="mt-2 pt-4 border-t border-border flex justify-center">
                  <a
                    href={APP_SETTINGS.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="active:scale-95 transition-transform"
                  >
                    <PlayStoreBadge className="h-14 w-auto object-contain" />
                  </a>
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
