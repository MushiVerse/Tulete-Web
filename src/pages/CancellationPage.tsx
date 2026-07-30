import React from 'react';
import { PageContainer } from '../shared/components/layout';
import { 
  XCircle, Clock, RefreshCw, AlertCircle, CheckCircle2, 
  ArrowLeft, MessageCircle, HelpCircle, ShieldAlert 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/components/ui/Button';

const WHATSAPP_SUPPORT_NUM = '255764587748';

export const CancellationPage = () => {
  const navigate = useNavigate();

  const handleOpenWhatsApp = () => {
    const msg = encodeURIComponent("Hello Tulete Support, I would like to request an order cancellation or refund assistance.");
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
      <div className="relative rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4">
            <XCircle className="w-4 h-4" /> Order Policies & Guidelines
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
            We aim for total satisfaction. Here is a clear breakdown of how order cancellations, modifications, and refunds work on Tulete.
          </p>
        </div>
      </div>

      {/* Strict 30-Minute Cancellation Window Notice */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 mb-12 flex flex-col md:flex-row items-start gap-5 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 font-extrabold text-xs uppercase tracking-wider mb-2">
            <AlertCircle className="w-3.5 h-3.5" /> Strict 30-Minute Time Limit
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">
            Order Cancellation Window: 30 Minutes Only
          </h2>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium mb-2">
            You may <strong>ONLY cancel an order within half an hour (30 minutes)</strong> after it has been placed.
          </p>
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed font-bold bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
            ⚠️ IMPORTANT: After 30 minutes pass, the cancellation period expires and the customer is fully obligated to receive and pay for the respective order.
          </p>
        </div>
      </div>

      {/* Timeline Rules */}
      <div className="mb-12">
        <h2 className="text-2xl font-extrabold text-foreground mb-6">Cancellation Stages & Time Window</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Stage 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold text-base mb-4">
              1
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                Within 30 Minutes
              </div>
              <h3 className="font-extrabold text-base text-foreground mb-2">Order Placed (0–30 Mins)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You may request a cancellation within half an hour of placing your order. Full or partial refund applies depending on kitchen prep state.
              </p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between border-amber-500/30">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-extrabold text-base mb-4">
              2
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                After 30 Minutes
              </div>
              <h3 className="font-extrabold text-base text-foreground mb-2">Window Closed (&gt;30 Mins)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cancellations are locked after 30 minutes. Customer is obligated to receive and pay for the order.
              </p>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between border-rose-500/30">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-extrabold text-base mb-4">
              3
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                Dispatched / Delivered
              </div>
              <h3 className="font-extrabold text-base text-foreground mb-2">Rider Delivery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rider delivers the order to your location. Customer must accept and complete payment for the respective order.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Refunds & Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">When are you eligible for a refund?</h3>
          <ul className="space-y-3 text-xs text-muted-foreground font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Missing or wrong items:</strong> If an item was left out or an incorrect item was delivered.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Damaged packaging:</strong> If meal packaging was severely damaged or spilled during transport.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Excessive delay:</strong> If delivery is delayed significantly beyond the estimated time due to rider/merchant error.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Merchant unavailability:</strong> If the store is unable to fulfill your order.</span>
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-3">Refund Processing Times</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            Approved refunds are credited back using your original payment method:
          </p>
          <div className="space-y-3 text-xs font-semibold text-foreground">
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border">
              <span>Tulete Wallet</span>
              <span className="text-emerald-500 font-extrabold">Instant</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border">
              <span>Mobile Money (M-Pesa, Tigo, Airtel)</span>
              <span className="text-primary font-extrabold">Within 24 Hours</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border">
              <span>Debit / Credit Card</span>
              <span className="text-muted-foreground font-extrabold">1 – 3 Business Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Support Action */}
      <div className="bg-card border border-border rounded-3xl p-8 text-center flex flex-col items-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-extrabold text-foreground mb-2">Need to cancel an active order?</h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Open your Order Tracking screen to cancel directly, or contact our support representative via WhatsApp for quick intervention.
        </p>
        <Button 
          onClick={handleOpenWhatsApp} 
          className="py-6 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 shadow-lg text-sm"
        >
          <MessageCircle className="w-5 h-5" /> Request Cancellation on WhatsApp (+255 764 587 748)
        </Button>
      </div>
    </PageContainer>
  );
};
