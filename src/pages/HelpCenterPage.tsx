import React, { useState } from 'react';
import { PageContainer } from '../shared/components/layout';
import { 
  Search, HelpCircle, MessageCircle, Phone, ArrowLeft, 
  Utensils, Shirt, ShoppingBag, Truck, Wallet, ChevronDown, 
  Sparkles, CheckCircle2, ShieldCheck, Clock 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../shared/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const WHATSAPP_SUPPORT_NUM = '255764587748';

const HELP_CATEGORIES = [
  { id: 'food', title: 'Food & Meals', icon: Utensils, count: '6 Articles' },
  { id: 'laundry', title: 'Laundry & Care', icon: Shirt, count: '5 Articles' },
  { id: 'products', title: 'Products & Shop', icon: ShoppingBag, count: '4 Articles' },
  { id: 'delivery', title: 'Delivery & Fees', icon: Truck, count: '5 Articles' },
  { id: 'payments', title: 'Payments & Wallet', icon: Wallet, count: '4 Articles' },
];

const FAQS = [
  {
    category: 'food',
    question: 'How does food delivery work on Tulete?',
    answer: 'Tulete connects you with top-rated local restaurants and kitchens in Dodoma. When you place a food order, the kitchen prepares your meal fresh, and a nearby Tulete rider picks it up in an insulated thermal container to deliver it hot to your specified location.'
  },
  {
    category: 'food',
    question: 'Can I customize my food order or add special instructions?',
    answer: 'Yes! While browsing meal options or during checkout, you can specify custom preferences (e.g. extra sauce, no onions, spice level) which are transmitted directly to the kitchen staff.'
  },
  {
    category: 'food',
    question: 'What if a meal is sold out or unavailable?',
    answer: 'Items update in real-time. If an item becomes unavailable after placing an order, our support team or merchant will immediately reach out to offer a replacement or process an instant refund to your wallet.'
  },
  {
    category: 'laundry',
    question: 'How does the Tulete Laundry Service operate?',
    answer: 'Select your laundry package (Wash & Fold, Dry Cleaning, Ironing, Duvets), schedule a convenient pickup time, and our verified partner cleaners collect your garments. They are expertly cleaned, folded/pressed, and returned to your doorstep within 24–48 hours.'
  },
  {
    category: 'laundry',
    question: 'How is laundry pricing calculated?',
    answer: 'Laundry pricing is transparently calculated based on specific garment types (e.g., shirts, suits, beddings) or bag weight ratios. You can review the exact estimated cost prior to confirming your order.'
  },
  {
    category: 'delivery',
    question: 'How are delivery fees calculated?',
    answer: 'Delivery fees are dynamically calculated using precise geocoding between your selected location and the merchant’s kitchen or shop. Fees are capped fairly (starting from TZS 800 up to TZS 1,600 for standard meals).'
  },
  {
    category: 'delivery',
    question: 'Can I track my delivery rider in real time?',
    answer: 'Absoluty! Once your order is dispatched, you can view live rider location, estimated arrival time, and contact details directly on the Order Tracking page.'
  },
  {
    category: 'payments',
    question: 'Which payment methods are accepted on Tulete?',
    answer: 'We accept M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, credit/debit cards, Tulete Wallet balance, and Cash on Delivery for eligible areas.'
  },
  {
    category: 'payments',
    question: 'How do refunds work on Tulete?',
    answer: 'If an order is cancelled or an issue is verified by support, funds are instantly credited back to your Tulete Wallet balance or refunded to your mobile money account within 24 hours.'
  }
];

export const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCategory = !activeCategory || faq.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenWhatsApp = () => {
    const msg = encodeURIComponent("Hello Tulete Support, I need help with my account/order.");
    window.open(`https://wa.me/${WHATSAPP_SUPPORT_NUM}?text=${msg}`, '_blank');
  };

  return (
    <PageContainer className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-primary/90 via-primary to-orange-600 text-white p-8 md:p-12 overflow-hidden shadow-xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold mb-4">
            <Sparkles className="w-4 h-4" /> 24/7 Customer Care
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            How can we help you today?
          </h1>
          <p className="text-white/90 text-sm sm:text-base font-medium mb-8 leading-relaxed">
            Search our knowledge base or browse popular topics below to get instant answers about orders, payments, delivery, and services.
          </p>

          {/* Search Box */}
          <div className="relative flex items-center w-full bg-white text-foreground rounded-2xl shadow-lg p-2">
            <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for answers e.g. delivery fee, refunds, tracking..."
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium px-3 placeholder:text-muted-foreground py-2"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground hover:text-foreground font-bold px-3">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="mb-12">
        <h2 className="text-xl font-extrabold text-foreground mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {HELP_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(isActive ? null : cat.id)}
                className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between group ${
                  isActive 
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                    : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm mb-1">{cat.title}</h3>
                  <span className={`text-[11px] font-medium ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>{cat.count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-foreground">Frequently Asked Questions</h2>
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} className="text-xs font-bold text-primary hover:underline">
                Show All FAQs
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center bg-card border border-border rounded-2xl">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-extrabold text-base mb-1">No matching articles found</h3>
              <p className="text-xs text-muted-foreground mb-4">Try adjusting your search terms or contact support directly.</p>
              <Button onClick={handleOpenWhatsApp} className="rounded-full text-xs">
                Ask via WhatsApp Support
              </Button>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-card border border-border rounded-2xl overflow-hidden transition-all shadow-sm hover:border-primary/30"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-extrabold text-sm sm:text-base flex items-center justify-between gap-4 text-foreground"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4 bg-muted/20"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp Direct Action Card */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-md text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-2">Still need help?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Our customer support team is available live on WhatsApp to resolve your queries instantly.
            </p>
            <Button 
              onClick={handleOpenWhatsApp} 
              className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg"
            >
              <MessageCircle className="w-5 h-5" /> Chat on WhatsApp (+255 764 587 748)
            </Button>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h4 className="font-extrabold text-sm uppercase tracking-wider mb-4 text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Service Guarantee
            </h4>
            <ul className="space-y-3 text-xs text-muted-foreground font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Verified Dodoma merchant network</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Insulated, hygienic packaging</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Instant wallet refunds for issues</li>
            </ul>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
