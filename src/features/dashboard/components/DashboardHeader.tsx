import React from 'react';
import { MapPin, Bell } from 'lucide-react';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { Avatar, AvatarFallback, AvatarImage } from '../../../shared/components/ui/Avatar';

export const DashboardHeader = () => {
  const { user } = useAuthStore();
  
  // Extract first name for greeting
  const firstName = user?.displayName?.split(' ')[0] || 'Guest';

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-background sticky top-0 z-40 shadow-sm md:shadow-none">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border shadow-sm">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${firstName}`} />
          <AvatarFallback>{firstName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col">
          <h1 className="text-sm font-medium text-muted-foreground">Hello, {firstName} 👋</h1>
          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-[150px]">Dodoma, TZ</span>
          </div>
        </div>
      </div>

      <button className="relative p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
        <Bell className="w-5 h-5 text-foreground" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-background"></span>
      </button>
    </header>
  );
};
