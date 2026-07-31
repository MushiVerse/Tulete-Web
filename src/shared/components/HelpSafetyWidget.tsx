import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const HelpSafetyWidget: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-3">Help & Safety</h2>
      <button
        onClick={() => navigate('/help')}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left cursor-pointer"
      >
        <span>❓ Help Center</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => navigate('/safety')}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left cursor-pointer"
      >
        <span>🛡️ Safety Info</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => navigate('/cancellation')}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left cursor-pointer"
      >
        <span>❌ Cancellation Policy</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => window.open('https://wa.me/255764587748?text=Hello%20Tulete%20Support', '_blank')}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-extrabold text-left cursor-pointer"
      >
        <span>💬 WhatsApp Support</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
