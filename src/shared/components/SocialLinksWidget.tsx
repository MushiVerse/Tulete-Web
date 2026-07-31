import React from 'react';
import { APP_SETTINGS } from '../../core/config/settings';
import { FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from './SocialIcons';

export const SocialLinksWidget: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Follow Us</h2>
      <div className="flex items-center justify-between gap-2">
        {[
          { name: 'Instagram', url: APP_SETTINGS.socialLinks.instagram, Icon: InstagramIcon, color: 'hover:bg-pink-600 hover:text-white' },
          { name: 'TikTok', url: APP_SETTINGS.socialLinks.tiktok, Icon: TikTokIcon, color: 'hover:bg-foreground hover:text-background' },
          { name: 'YouTube', url: APP_SETTINGS.socialLinks.youtube, Icon: YoutubeIcon, color: 'hover:bg-red-600 hover:text-white' },
          { name: 'Facebook', url: APP_SETTINGS.socialLinks.facebook, Icon: FacebookIcon, color: 'hover:bg-blue-600 hover:text-white' },
        ].map(({ name, url, Icon, color }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center p-3 rounded-2xl bg-muted/40 transition-colors text-foreground ${color}`}
            title={name}
          >
            <Icon className="w-5 h-5" />
          </a>
        ))}
      </div>
    </div>
  );
};
