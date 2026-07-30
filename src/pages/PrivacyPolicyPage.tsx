import React from 'react';
import { PageContainer } from '../shared/components/layout';
import { Shield, Lock, Eye, FileText, ArrowLeft, CheckCircle2, Server, Smartphone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicyPage = () => {
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
      <div className="relative rounded-3xl bg-gradient-to-r from-primary/90 via-primary to-orange-600 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4">
            <Shield className="w-4 h-4" /> Data Protection & Transparency
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
            Last Updated: July 2026. Learn how Tulete Inc. collects, uses, and protects your personal information across our food, laundry, and product marketplace in Tanzania.
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8 bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm text-foreground">
        
        {/* Section 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">1. Information We Collect</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            To provide reliable food delivery, laundry services, and product orders in Dodoma and across Tanzania, we collect information you provide directly and data generated automatically when using the Tulete Web App.
          </p>
          <ul className="space-y-2 text-xs sm:text-sm font-medium text-foreground/90 pl-4 border-l-2 border-primary/30">
            <li><strong>Account & Identity Data:</strong> Your name, phone number, email address, and saved delivery addresses.</li>
            <li><strong>Precise Location Data:</strong> GPS coordinates and delivery address pins used to calculate dynamic delivery pricing and route delivery riders accurately.</li>
            <li><strong>Transaction & Order History:</strong> Meal choices, laundry garment items, product orders, wallet balance transactions, and payment receipts.</li>
            <li><strong>Technical & Device Information:</strong> IP address, browser type, operating system, and local preference storage (cart & favorites).</li>
          </ul>
        </section>

        <hr className="border-border/60" />

        {/* Section 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">2. How We Use Your Information</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            Your data is strictly utilized to facilitate seamless orders and enhance your user experience:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <span className="font-extrabold text-foreground block mb-1">🛒 Order Fulfillment</span>
              <span className="text-muted-foreground">Transmitting meal & garment details to local partner kitchens and dry cleaners.</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <span className="font-extrabold text-foreground block mb-1">📍 Delivery & Rider Routing</span>
              <span className="text-muted-foreground">Providing assigned riders with your location pin for timely doorstep delivery.</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <span className="font-extrabold text-foreground block mb-1">💳 Payment Processing</span>
              <span className="text-muted-foreground">Verifying M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, Card, and Tulete Wallet payments.</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <span className="font-extrabold text-foreground block mb-1">💬 Customer Support</span>
              <span className="text-muted-foreground">Assisting you via WhatsApp support (+255 764 587 748 / +255 757 449 734).</span>
            </div>
          </div>
        </section>

        <hr className="border-border/60" />

        {/* Section 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-extrabold shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">3. Data Security & Third-Party Sharing</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            We employ 256-bit SSL encryption and strict Firebase database security rules to safeguard your personal information.
          </p>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 font-medium">
            🔒 <strong>Zero Data Monetization:</strong> Tulete does NOT sell, rent, or trade customer personal data to third-party advertisers. Information is shared strictly with assigned riders and partner merchants required to complete your delivery.
          </div>
        </section>

        <hr className="border-border/60" />

        {/* Section 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">4. Your Data Rights & Deletion Requests</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            In accordance with Tanzanian data protection guidelines, you have the right to access, correct, or request the complete deletion of your account and personal data stored on Tulete.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            To request data export or account closure, contact our privacy compliance representative on WhatsApp at <strong>+255 764 587 748</strong> or send an inquiry directly through the app.
          </p>
        </section>

      </div>
    </PageContainer>
  );
};
