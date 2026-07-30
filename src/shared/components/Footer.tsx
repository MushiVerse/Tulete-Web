import React from 'react';
import { Link } from 'react-router-dom';
import { Send, ShieldCheck } from 'lucide-react';
import logoImg from '../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';
import { APP_SETTINGS } from '../../core/config/settings';
import { useDeviceOS } from '../../core/hooks/useDeviceOS';
import { FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from './SocialIcons';
import { LanguageCurrencySelector } from './LanguageCurrencySelector';

export const Footer = () => {
  const { showPlayBadge } = useDeviceOS();
  const [inquiryQuestion, setInquiryQuestion] = React.useState('');

  const handleContactUs = (e: React.MouseEvent) => {
    e.preventDefault();
    const msg = encodeURIComponent("Hello Tulete Support, I have a question regarding your services.");
    window.open('https://wa.me/255764587748?text=' + msg, '_blank');
  };

  const handleSendStayUpdated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryQuestion.trim()) return;
    const msg = encodeURIComponent(`Hello Tulete Team,\n\nI have a question:\n${inquiryQuestion.trim()}`);
    window.open('https://wa.me/255757449734?text=' + msg, '_blank');
    setInquiryQuestion('');
  };

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
              <span className="notranslate text-2xl font-extrabold tracking-tight text-white" translate="no">Tulete</span>
            </div>
            <p className="text-sm text-secondary-foreground/70 leading-relaxed font-medium pr-4">
              Your premium marketplace for laundry, food delivery, and daily essentials. Fast, reliable, and right at your doorstep. We bring the city to you.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {[
                { name: 'Instagram', url: APP_SETTINGS.socialLinks.instagram, Icon: InstagramIcon },
                { name: 'TikTok', url: APP_SETTINGS.socialLinks.tiktok, Icon: TikTokIcon },
                { name: 'YouTube', url: APP_SETTINGS.socialLinks.youtube, Icon: YoutubeIcon },
                { name: 'Facebook', url: APP_SETTINGS.socialLinks.facebook, Icon: FacebookIcon },
              ].map(({ name, url, Icon }) => (
                <a 
                  key={name} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title={name}
                  aria-label={name}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-secondary-foreground/80 hover:bg-primary hover:text-primary-foreground hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(249,148,32,0.4)] hover:border-primary transition-all duration-300"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            {/* Google Play Store Badge — hidden on iPhone/iPad */}
            {showPlayBadge && (
              <div className="pt-4">
                <a
                  href={APP_SETTINGS.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center active:scale-95 transition-transform hover:-translate-y-0.5 duration-300"
                >
                  <img
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                    alt="Get it on Google Play"
                    className="h-14 w-auto object-contain"
                    draggable={false}
                  />
                </a>
              </div>
            )}
          </div>

          {/* Quick Links (Takes up 2 columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Discover</h3>
            <ul className="space-y-4">
              <li><Link to="/explore" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Explore Services</Link></li>
              <li><Link to="/laundry" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Premium Laundry</Link></li>
              <li><Link to="/food" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Order Food</Link></li>
              <li><Link to="/products" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-block flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Shop Products</Link></li>

            </ul>
          </div>

          {/* Support (Takes up 2 columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Support</h3>
            <ul className="space-y-4">
              <li><Link to="/help" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Help Center</Link></li>
              <li><Link to="/safety" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Safety Info</Link></li>
              <li><Link to="/cancellation" className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Cancellation</Link></li>
              <li>
                <a 
                  href="https://wa.me/255764587748"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContactUs}
                  className="text-sm font-medium text-secondary-foreground/70 hover:text-primary hover:translate-x-2 transition-all duration-300 inline-flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter / Contact (Takes up 4 columns) */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-extrabold tracking-wider uppercase mb-6 text-white">Stay Updated</h3>
            <p className="text-sm font-medium text-secondary-foreground/70 mb-5">
              Have a question or need an answer? Type your question below and send directly to our support team on WhatsApp.
            </p>
            <form onSubmit={handleSendStayUpdated} className="flex gap-2 relative">
              <input 
                type="text" 
                value={inquiryQuestion}
                onChange={(e) => setInquiryQuestion(e.target.value)}
                placeholder="What do you need an answer for?" 
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-3.5 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all backdrop-blur-sm"
                required
              />
              <button 
                type="submit" 
                title="Send question via WhatsApp (+255757449734)"
                className="absolute right-1.5 top-1.5 bottom-1.5 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-colors shadow-[0_0_10px_rgba(249,148,32,0.3)]"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-secondary-foreground/50">
              <ShieldCheck className="w-4 h-4 text-primary/70" /> Messages sent directly to (+255 757 449 734)
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-medium text-secondary-foreground/50 flex items-center gap-2">
            © {new Date().getFullYear()} Tulete Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <LanguageCurrencySelector />
            <Link to="/privacy" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="text-sm font-medium text-secondary-foreground/50 hover:text-primary transition-colors">Cookies Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

