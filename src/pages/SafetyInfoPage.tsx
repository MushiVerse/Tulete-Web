import React from 'react';
import { PageContainer } from '../shared/components/layout';
import { 
  ShieldCheck, Lock, Sparkles, CheckCircle2, HeartHandshake, 
  Utensils, Shirt, Truck, UserCheck, PhoneCall, ArrowLeft, MessageCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/components/ui/Button';

const WHATSAPP_SUPPORT_NUM = '255764587748';

export const SafetyInfoPage = () => {
  const navigate = useNavigate();

  const handleOpenWhatsApp = () => {
    const msg = encodeURIComponent("Hello Tulete Support, I have a safety query or concern.");
    window.open(`https://wa.me/${WHATSAPP_SUPPORT_NUM}?text=${msg}`, '_blank');
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
            <ShieldCheck className="w-4 h-4" /> Trust & Security Standards
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Your Safety & Peace of Mind Come First
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
            At Tulete, we adhere to strict safety protocols across food preparation, garment handling, rider verification, and digital transactions across Dodoma.
          </p>
        </div>
      </div>

      {/* Safety Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Food Hygiene */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6">
            <Utensils className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">Food Hygiene & Sealed Packaging</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            All partner kitchens undergo strict health inspections. Meals are packed in tamper-evident sealed packaging to guarantee zero contamination during transit.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Temperature-controlled thermal rider bags</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Verified food handler health permits</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Contactless delivery option upon request</li>
          </ul>
        </div>

        {/* Garment Protection */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-6">
            <Shirt className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">Laundry & Garment Care Guarantee</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            Garments are individually tagged, inspected, and processed according to specific fabric care symbols. Delicate fabrics receive specialized eco-friendly treatment.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Individual bag isolation (no mixing of customer loads)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Garment protection policy against damage or loss</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Moisture-proof protective garment covers</li>
          </ul>
        </div>

        {/* Rider Verification */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">Rider Background Verification</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            Every delivery rider undergoes national ID verification, background checks, and customer service safety training prior to joining the fleet.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Real-time GPS order tracking</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Mask and sanitation compliance</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Masked phone numbers to protect your privacy</li>
          </ul>
        </div>

        {/* Payment & Data Safety */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">Digital Payments & Data Privacy</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            Transactions are processed through encrypted gateways (M-Pesa, Tigo Pesa, Visa, Mastercard). We never store raw payment credentials on our servers.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> 256-bit SSL encryption across the platform</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Secure Mobile Money push notification checkout</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Strict personal data protection policy</li>
          </ul>
        </div>
      </div>

      {/* Safety Contact Banner */}
      <div className="bg-card border border-border rounded-3xl p-8 text-center flex flex-col items-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <HeartHandshake className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-extrabold text-foreground mb-2">Have a safety question or issue?</h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Report any safety concerns directly to our dedicated Trust & Safety team via WhatsApp for immediate priority support.
        </p>
        <Button 
          onClick={handleOpenWhatsApp} 
          className="py-6 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 shadow-lg text-sm"
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp Safety Line (+255 764 587 748)
        </Button>
      </div>
    </PageContainer>
  );
};
