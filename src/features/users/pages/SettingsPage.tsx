import React, { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userService, UserPreferences } from '../../users/services/userService';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  Bell, Moon, Globe, Ruler, ShieldCheck, Trash2,
  ChevronRight, Package, Truck, MessageSquare, Tag, Info
} from 'lucide-react';
import { motion } from 'framer-motion';

// ---- Inline Settings Store ----
interface SettingsStore {
  prefs: UserPreferences | null;
  initialized: boolean;
  initialize: () => void;
  toggle: (key: keyof UserPreferences) => void;
  set: (key: keyof UserPreferences, value: any) => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (setState, getState) => ({
      prefs: null,
      initialized: false,

      initialize: () => {
        if (getState().initialized) return;
        const mockPrefs = userService.getMockPreferences();
        setState({ prefs: mockPrefs, initialized: true });
      },

      toggle: (key) => {
        const { prefs } = getState();
        if (!prefs) return;
        setState({ prefs: { ...prefs, [key]: !prefs[key as keyof UserPreferences] } });
      },

      set: (key, value) => {
        const { prefs } = getState();
        if (!prefs) return;
        setState({ prefs: { ...prefs, [key]: value } });
      },
    }),
    { name: 'tulete_settings_storage' }
  )
);

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
  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
        {description && <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>

    {/* Custom toggle pill */}
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 flex items-center px-0.5 focus:outline-none ${
        value ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
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
  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
    </div>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

// ---- Main Settings Page ----
export const SettingsPage = () => {
  const { prefs, initialized, initialize, toggle, set } = useSettingsStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!prefs) return null;

  return (
    <PageWrapper className="py-6 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
          Preferences
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">
          Account Settings
        </h1>
      </div>

      <div className="space-y-5">
        {/* NOTIFICATIONS SECTION */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 flex items-center gap-2">
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
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> Display & Localization
            </h3>
          </div>

          <ToggleRow
            icon={<Moon className="w-3.5 h-3.5 text-slate-400" />}
            label="Dark Mode"
            description="Switch between light and dark interface theme"
            value={prefs.darkMode}
            onChange={() => toggle('darkMode')}
          />
          <SelectRow
            icon={<Globe className="w-3.5 h-3.5 text-slate-500" />}
            label="Currency Display"
            value={prefs.currencyDisplay}
            options={[{ label: 'KES (Kenyan Shilling)', value: 'KES' }, { label: 'USD (US Dollar)', value: 'USD' }]}
            onChange={(v) => set('currencyDisplay', v)}
          />
          <SelectRow
            icon={<Ruler className="w-3.5 h-3.5 text-slate-500" />}
            label="Distance Unit"
            value={prefs.distanceUnit}
            options={[{ label: 'Kilometers (km)', value: 'km' }, { label: 'Miles (mi)', value: 'miles' }]}
            onChange={(v) => set('distanceUnit', v)}
          />
        </Card>

        {/* SECURITY SECTION */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Security & Privacy
            </h3>
          </div>

          {[
            { label: 'Change Password', description: 'Update your account password' },
            { label: 'Linked Devices', description: 'Manage sessions and trusted devices' },
            { label: 'Privacy Controls', description: 'Control your data and profile visibility' },
            { label: 'Download My Data', description: 'Export all your Tulete account data' },
          ].map(({ label, description }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
          ))}
        </Card>

        {/* DANGER ZONE */}
        <Card className="border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-rose-500 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Danger Zone
            </h3>
          </div>

          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Delete Account</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Permanently remove your account and all associated data</p>
            </div>
            <button className="text-[10px] font-extrabold text-rose-500 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-1.5 hover:bg-rose-500 hover:text-white transition-all">
              Delete
            </button>
          </div>
        </Card>

        {/* App version footer */}
        <div className="text-center text-[9px] text-slate-400 font-bold py-2 uppercase tracking-widest">
          Tulete App v2.0.0 — Nairobi, Kenya 🇰🇪
        </div>
      </div>
    </PageWrapper>
  );
};
