import React, { useState } from 'react';
import { PageContainer } from '../shared/components/layout';
import { 
  MessageCircle, Phone, MapPin, Mail, Clock, Send, 
  ArrowLeft, Sparkles, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/components/ui/Button';

const MAIN_SUPPORT_WHATSAPP = '255764587748';
const INQUIRY_WHATSAPP = '255757449734';

export const ContactPage = () => {
  const navigate = useNavigate();
  const [inquiryText, setInquiryText] = useState('');

  const handleOpenDirectChat = () => {
    const msg = encodeURIComponent("Hello Tulete Support, I would like to contact your team.");
    window.open(`https://wa.me/${MAIN_SUPPORT_WHATSAPP}?text=${msg}`, '_blank');
  };

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    const msg = encodeURIComponent(`Hello Tulete Team,\n\nI have a question/inquiry:\n${inquiryText.trim()}`);
    window.open(`https://wa.me/${INQUIRY_WHATSAPP}?text=${msg}`, '_blank');
    setInquiryText('');
  };

  return (
    <PageContainer className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4">
            <MessageCircle className="w-4 h-4" /> Direct Communication
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Contact Tulete Support
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
            We are here for you 24/7. Reach out directly on WhatsApp for customer care, orders, merchant partnerships, or instant questions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Direct WhatsApp Chat Action Card (+255764587748) */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <MessageCircle className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-3">Live WhatsApp Chat</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
              Chat directly with a live support representative for order updates, general support, or immediate assistance.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-foreground">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>WhatsApp: +255 764 587 748</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-foreground">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Availability: 24/7 Round-the-Clock</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Location: Dodoma, Tanzania</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleOpenDirectChat}
            className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg text-sm"
          >
            <MessageCircle className="w-5 h-5" /> Start Chat on WhatsApp (+255 764 587 748)
          </Button>
        </div>

        {/* Send Question / Inquiry Form (+255757449734) */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Send className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Ask a Question</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
            Write what you need an answer for below, and submit directly to our inquiry line via WhatsApp.
          </p>

          <form onSubmit={handleSendInquiry} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                What do you need an answer for?
              </label>
              <textarea
                rows={4}
                value={inquiryText}
                onChange={(e) => setInquiryText(e.target.value)}
                placeholder="Type your question, feedback, or custom order inquiry here..."
                className="w-full bg-muted/40 border border-border rounded-2xl p-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 rounded-2xl bg-primary text-primary-foreground font-extrabold flex items-center justify-center gap-2 shadow-md"
            >
              <Send className="w-5 h-5" /> Send via WhatsApp (+255 757 449 734)
            </Button>
          </form>
        </div>
      </div>

      {/* Official Social Media Links Banner */}
      <div className="bg-card border border-border rounded-3xl p-8 text-center flex flex-col items-center shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-extrabold text-foreground">Follow Us on Social Media</h3>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6">
          Stay connected with Tulete for daily deals, behind-the-scenes content, and special community updates.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { name: 'Facebook', url: 'https://www.facebook.com/share/1BAsk78Dwy/', color: 'bg-blue-600/10 text-blue-600 border-blue-600/20 hover:bg-blue-600 hover:text-white' },
            { name: 'Instagram', url: 'https://www.instagram.com/tulete_enterprises/', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-600 hover:text-white' },
            { name: 'TikTok', url: 'https://www.tiktok.com/@tulete_enterprises', color: 'bg-stone-500/10 text-foreground border-border hover:bg-foreground hover:text-background' },
            { name: 'YouTube', url: 'https://www.youtube.com/@tulete_enterprises', color: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-600 hover:text-white' },
          ].map(social => (
            <a 
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2.5 rounded-2xl border font-extrabold text-xs transition-all flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 ${social.color}`}
            >
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
