import React, { useState, useEffect } from 'react';
import { PageContainer } from '../shared/components/layout';
import { Cookie, ShieldCheck, Check, ArrowLeft, Info, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/components/ui/Button';

export const CookiesSettingsPage = () => {
  const navigate = useNavigate();

  // Cookie preference states (Essential is always true)
  const [essential] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [functional, setFunctional] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Read saved preferences from localStorage
    const saved = localStorage.getItem('tulete_cookie_preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.analytics === 'boolean') setAnalytics(parsed.analytics);
        if (typeof parsed.functional === 'boolean') setFunctional(parsed.functional);
      } catch (e) {
        console.error('Error loading cookie preferences:', e);
      }
    }
  }, []);

  const handleSavePreferences = () => {
    const preferences = { essential: true, analytics, functional, timestamp: new Date().toISOString() };
    localStorage.setItem('tulete_cookie_preferences', JSON.stringify(preferences));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <PageContainer className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4">
            <Cookie className="w-4 h-4" /> Privacy & Local Storage
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Cookie Settings
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
            Manage your cookie and local preference settings for the Tulete Web App. Customize how we store cart, session, and search preferences on your device.
          </p>
        </div>
      </div>

      {/* Preference Toggles */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 mb-8">
        
        {/* Essential Cookies (Mandatory) */}
        <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-muted/30 border border-border">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-extrabold text-base text-foreground">Strictly Essential Cookies</h3>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase">Required</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Required for core app operation, including user session authentication, shopping cart items, selected delivery location, and security tokens.
            </p>
          </div>
          <input 
            type="checkbox" 
            checked={essential} 
            disabled 
            className="w-5 h-5 rounded accent-primary cursor-not-allowed mt-1" 
          />
        </div>

        {/* Analytics & Performance Cookies */}
        <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
          <div className="flex-1">
            <h3 className="font-extrabold text-base text-foreground mb-1">Analytics & Performance Cookies</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Allows us to measure app performance, page load speeds, and popular meal/laundry search queries to improve overall service in Dodoma.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input 
              type="checkbox" 
              checked={analytics} 
              onChange={(e) => setAnalytics(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Functional & Preference Cookies */}
        <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
          <div className="flex-1">
            <h3 className="font-extrabold text-base text-foreground mb-1">Functional & Preference Cookies</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Remembers your favorite merchants, category filters, language settings, and dark/light theme preference across visits.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input 
              type="checkbox" 
              checked={functional} 
              onChange={(e) => setFunctional(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

      </div>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>Preferences are saved locally to your current web browser.</span>
        </div>
        <Button 
          onClick={handleSavePreferences}
          className="w-full sm:w-auto py-3.5 px-8 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" /> Preferences Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Cookie Preferences
            </>
          )}
        </Button>
      </div>
    </PageContainer>
  );
};
