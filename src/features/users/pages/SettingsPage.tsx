import React, { useState } from 'react';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { UserPreferences } from '../services/userService';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { PageContainer, ContentContainer, PageHeader, Section } from '../../../shared/components/layout';
import { Card } from '../../../shared/components/ui/Card';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ChangePasswordModal, DeleteAccountModal } from '../components/SecurityModals';
import {
  Bell, Moon, Globe, Ruler, ShieldCheck, Trash2,
  ChevronRight, Package, Truck, MessageSquare, Tag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { LanguageCurrencySelector } from '../../../shared/components/LanguageCurrencySelector';

// ---- Toggle Row ----
const ToggleRow = ({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onChange: () => void;
}) => (
  <div className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>

    {/* Custom toggle pill */}
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 flex items-center px-0.5 focus:outline-none ${
        value ? 'bg-primary' : 'bg-muted'
      }`}
      style={{ height: '22px', minWidth: '40px' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="w-4 h-4 bg-white rounded-full shadow block"
        style={{ marginLeft: value ? '16px' : '1px' }}
      />
    </button>
  </div>
);

// ---- Select Row ----
const SelectRow = ({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs font-bold text-foreground">{label}</p>
    </div>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[10px] font-bold bg-muted border border-border rounded-lg px-2.5 py-1.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

// ---- Main Settings Page ----
export const SettingsPage = () => {
  const { data: prefs, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();
  const { setTheme } = useThemeStore();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const toggle = (key: keyof UserPreferences) => {
    if (!prefs) return;
    const newValue = !prefs[key];
    updateSettings.mutate({ [key]: newValue });
    
    // Specifically handle dark mode real-time update
    if (key === 'darkMode') {
      setTheme(newValue as boolean);
    }
  };

  const setVal = (key: keyof UserPreferences, value: any) => {
    if (!prefs) return;
    updateSettings.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <ContentContainer size="sm" className="space-y-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </ContentContainer>
      </PageContainer>
    );
  }

  if (isError || !prefs) {
    return <div className="p-8 text-center text-rose-500">Failed to load settings.</div>;
  }

  return (
    <PageContainer>
      <ContentContainer size="sm">
        {/* Header */}
        <PageHeader 
          title="Account Settings"
          action={
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Preferences
            </span>
          }
        />

      <div className="space-y-5">
        {/* NOTIFICATIONS SECTION */}
        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-muted border-b border-border">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Notification Preferences
            </h3>
          </div>

          <ToggleRow
            icon={<Package className="w-3.5 h-3.5 text-indigo-500" />}
            label="Order Updates"
            description="Status changes, confirmations, ready alerts"
            value={prefs.notifyOrders}
            onChange={() => toggle('notifyOrders')}
          />
          <ToggleRow
            icon={<Truck className="w-3.5 h-3.5 text-emerald-500" />}
            label="Delivery Alerts"
            description="Real-time rider tracking and arrival notifications"
            value={prefs.notifyDelivery}
            onChange={() => toggle('notifyDelivery')}
          />
          <ToggleRow
            icon={<MessageSquare className="w-3.5 h-3.5 text-sky-500" />}
            label="Messages"
            description="In-app chat from stores and attendants"
            value={prefs.notifyMessages}
            onChange={() => toggle('notifyMessages')}
          />
          <ToggleRow
            icon={<Tag className="w-3.5 h-3.5 text-amber-500" />}
            label="Promotions & Deals"
            description="Weekend offers, new service announcements"
            value={prefs.notifyPromotions}
            onChange={() => toggle('notifyPromotions')}
          />
        </Card>

        {/* DISPLAY SECTION */}
        <Card className="border border-border bg-card shadow-sm overflow-visible relative z-20">
          <div className="px-5 py-3.5 bg-muted border-b border-border rounded-t-xl">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> Display & Localization
            </h3>
          </div>

          <ToggleRow
            icon={<Moon className="w-3.5 h-3.5 text-muted-foreground" />}
            label="Dark Mode"
            description="Switch between light and dark interface theme"
            value={prefs.darkMode}
            onChange={() => toggle('darkMode')}
          />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 relative z-30">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Language & Currency</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Select preferred language and currency display</p>
              </div>
            </div>

            <LanguageCurrencySelector />
          </div>
          <SelectRow
            icon={<Ruler className="w-3.5 h-3.5 text-muted-foreground" />}
            label="Distance Unit"
            value={prefs.distanceUnit}
            options={[{ label: 'Kilometers (km)', value: 'km' }, { label: 'Miles (mi)', value: 'miles' }]}
            onChange={(v) => setVal('distanceUnit', v)}
          />
        </Card>

        {/* SECURITY SECTION */}
        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-muted border-b border-border">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Security & Privacy
            </h3>
          </div>

          <div 
            className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 cursor-pointer group hover:bg-accent transition-colors"
            onClick={() => setIsPasswordModalOpen(true)}
          >
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Change Password</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Update your account password</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 cursor-pointer group hover:bg-accent transition-colors">
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Linked Devices</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Manage sessions and trusted devices</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        {/* DANGER ZONE */}
        <Card className="border border-rose-100 dark:border-rose-900/40 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-rose-500 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Danger Zone
            </h3>
          </div>

          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Delete Account</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Permanently remove your account and all associated data</p>
            </div>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-[10px] font-extrabold text-rose-500 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-1.5 hover:bg-rose-500 hover:text-white transition-all"
            >
              Delete
            </button>
          </div>
        </Card>

        {/* App version footer */}
        <div className="text-center text-[9px] text-muted-foreground font-bold py-2 uppercase tracking-widest">
          Tulete Web App v{APP_SETTINGS.version} — Dodoma, Tanzania 🇹🇿
        </div>
      </div>

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
      </ContentContainer>
    </PageContainer>
  );
};
