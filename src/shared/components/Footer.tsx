import React from 'react';
import { Link } from 'react-router-dom';
import { Send, ShieldCheck } from 'lucide-react';
import logoImg from '../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';
import { APP_SETTINGS } from '../../core/config/settings';

export const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-secondary-foreground/10 mt-auto w-full relative overflow-hidden">
      {/* Subtle brand glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand & Description (Takes up 4 columns on large screens) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src={logoImg} 
                alt="Tulete Logo" 
                width={48}
                height={48}
                className="h-12 w-12 object-contain rounded-md bg-white p-1"
              />
              <span className="text-2xl font-extrabold tracking-tight text-white">Tulete</span>
            </div>
            <p className="text-sm text-secondary-foreground/70 leading-relaxed font-medium pr-4">
              Your premium marketplace for laundry, food delivery, and daily essentials. Fast, reliable, and right at your doorstep. We bring the city to you.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {['FB', 'X', 'IG', 'IN'].map(social => (
                <a key={social} href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-secondary-foreground/80 hover:bg-primary hover:text-primary-foreground hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(249,148,32,0.4)] hover:border-primary font-bold text-xs transition-all duration-300">
                  {social}
                </a>
              ))}
            </div>
            {/* Google Play Store Badge */}
            <div className="pt-4">
              <a
                href={APP_SETTINGS.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all duration-300 hover:-translate-y-0.5 shadow-md"
              >
                <svg className="size-6 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.60938 2.01562C3.42188 2.20312 3.32812 2.5 3.32812 2.92188V21.0781C3.32812 21.5 3.42188 21.7969 3.60938 21.9844L3.6875 22.0625L13.7188 12.0312V11.9688L3.6875 1.9375L3.60938 2.01562Z" fill="#00C6FF"/>
                  <path d="M17.0625 8.6875L13.7188 12.0312V11.9688L17.0625 8.625L17.1406 8.6875C17.5156 8.90625 17.7812 9.3125 17.7812 9.8125C17.7812 10.3125 17.5156 10.7188 17.1406 10.9375L17.0625 10.9688L13.7188 12.0312L17.0625 8.6875Z" fill="#FF3A44"/>
                  <path d="M13.7188 12.0312L3.6875 22.0625C4.01562 22.1094 4.39062 22.0156 4.71875 21.8281L17.0625 14.7188L13.7188 12.0312Z" fill="#00F076"/>
                  <path d="M13.7188 11.9688L4.71875 2.17188C4.39062 1.98438 4.01562 1.89062 3.6875 1.9375L13.7188 11.9688Z" fill="#FFC107"/>
                </svg>
                <div className="text-left leading-none">
                  <span className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Get it on</span>
                  <span className="block text-sm font-black text-white mt-1.5">Google Play</span>
                </div>
              </a>
            </div>
          </div>

          {/* Quick Links (Takes up 2 columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Discover</h3>
            <ul className="space-y-4">
              <li><Link to="/explore" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Explore Services</Link></li>
              <li><Link to="/laundry" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Premium Laundry</Link></li>
              <li><Link to="/food" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Order Food</Link></li>
              <li><Link to="/products" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Shop Products</Link></li>
              <li><Link to="/dashboard" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Provider Portal</Link></li>
            </ul>
          </div>

          {/* Support (Takes up 2 columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Support</h3>
            <ul className="space-y-4">
              <li><Link to="/help" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Help Center</Link></li>
              <li><Link to="/safety" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Safety Info</Link></li>
              <li><Link to="/cancellation" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Cancellation</Link></li>
              <li><Link to="/contact" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Contact Us</Link></li>
            </ul>
          </div>

          {/* Newsletter / Contact (Takes up 4 columns) */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Stay Updated</h3>
            <p className="text-sm font-medium text-secondary-foreground/70 mb-5">
              Subscribe to our newsletter for exclusive deals, latest services, and community updates.
            </p>
            <div className="flex gap-2 relative">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-3.5 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all backdrop-blur-sm"
              />
              <button className="absolute right-1.5 top-1.5 bottom-1.5 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-colors shadow-[0_0_10px_rgba(249,148,32,0.3)]">
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-secondary-foreground/50">
              <ShieldCheck className="w-4 h-4 text-primary/70" /> We respect your privacy. No spam.
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-medium text-secondary-foreground/50 flex items-center gap-2">
            © {new Date().getFullYear()} Tulete Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Link to="/privacy" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Cookies Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

