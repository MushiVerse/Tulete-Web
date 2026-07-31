import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ShieldCheck, Headphones, ArrowUpRight } from 'lucide-react';

export const HelpSafetyWidget: React.FC = () => {
  const items = [
    {
      title: 'Help Center',
      desc: 'FAQs & guide',
      icon: HelpCircle,
      to: '/help',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Safety Info',
      desc: 'Buyer protection',
      icon: ShieldCheck,
      to: '/safety',
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: '24/7 Support',
      desc: 'Chat on WhatsApp',
      icon: Headphones,
      href: 'https://wa.me/255764587748',
      color: 'bg-blue-500/10 text-blue-500',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Help & Safety
        </h2>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">{item.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          );

          if (item.href) {
            return (
              <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className="block">
                {content}
              </a>
            );
          }

          if (item.to) {
            return (
              <Link key={item.title} to={item.to} className="block">
                {content}
              </Link>
            );
          }

          return (
            <div key={item.title} className="block">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
};
