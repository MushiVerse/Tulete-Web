import React from 'react';
import { PageContainer } from '../shared/components/layout';
import { FileText, Clock, AlertTriangle, CheckCircle2, ArrowLeft, ShieldAlert, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <PageContainer className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-800 via-slate-900 to-zinc-900 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4 text-primary">
            <Scale className="w-4 h-4" /> User Agreement & Terms
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Terms of Service
          </h1>
          <p className="text-white/80 text-sm sm:text-base font-medium leading-relaxed">
            Please read these terms carefully before placing food, laundry, or product orders on Tulete Web App.
          </p>
        </div>
      </div>

      {/* Critical 30-Minute Cancellation Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 mb-10 flex flex-col md:flex-row items-start gap-5 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 font-extrabold text-xs uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Binding Order Policy
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">
            Order Cancellation & Obligation Rules
          </h2>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium mb-2">
            Orders placed on Tulete may <strong>ONLY be cancelled within 30 minutes (half an hour)</strong> from the time of submission.
          </p>
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed font-bold bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
            ⚠️ LEGAL BINDING: After 30 minutes pass, the cancellation period expires and the customer is legally obligated to receive and pay for the respective order in full upon delivery.
          </p>
        </div>
      </div>

      {/* Main Terms Sections */}
      <div className="space-y-8 bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm text-foreground">
        
        {/* Section 1 */}
        <section>
          <h2 className="text-xl font-extrabold mb-3">1. Service Scope & Platform Role</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Tulete provides a digital service hub connecting consumers with verified restaurants, dry cleaners, and product merchants operating in Dodoma and Tanzania. While Tulete manages delivery dispatch and platform payments, partner merchants are responsible for meal preparation and laundry service execution.
          </p>
        </section>

        <hr className="border-border/60" />

        {/* Section 2 */}
        <section>
          <h2 className="text-xl font-extrabold mb-3">2. Pricing & Dynamic Delivery Fees</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
            All prices on Tulete are displayed in Tanzanian Shillings (TZS). Delivery fees are dynamically calculated based on real-time distance between the customer’s selected location and the fulfilling merchant store.
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-foreground font-medium pl-4 border-l-2 border-primary/30">
            <li>Standard delivery fees range dynamically from TZS 800 to TZS 1,600.</li>
            <li>Users are shown the exact breakdown (Subtotal, Delivery Fee, Discount, Total) prior to checkout.</li>
          </ul>
        </section>

        <hr className="border-border/60" />

        {/* Section 3 */}
        <section>
          <h2 className="text-xl font-extrabold mb-3">3. Payments & Mobile Money Settlement</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
            Tulete supports payments via M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, credit/debit cards, Tulete Wallet balance, and Cash on Delivery.
          </p>
          <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Failure to complete payment upon delivery for a valid non-cancelled order may result in immediate Tulete account suspension and collection enforcement under applicable laws.
          </div>
        </section>

        <hr className="border-border/60" />

        {/* Section 4 */}
        <section>
          <h2 className="text-xl font-extrabold mb-3">4. Laundry Garment Care & Liability</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            For laundry orders, garments are inspected upon pickup. Any existing damage or fabric defects will be flagged. Claims regarding damaged garments during processing must be submitted within 24 hours of delivery accompanied by clear photos.
          </p>
        </section>

      </div>
    </PageContainer>
  );
};
