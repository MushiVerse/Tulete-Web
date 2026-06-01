import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { motion, AnimatePresence } from 'framer-motion';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getTotals } = useCartStore();
  const { subtotal, deliveryFee, serviceFee, total, itemCount } = getTotals();

  if (items.length === 0) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-slate-900 dark:text-white">Your Cart is Empty</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-base">
            Looks like you haven't added anything to your cart yet. Let's find some amazing items for you!
          </p>
          <Button 
            onClick={() => navigate('/discover')} 
            size="lg"
            className="w-full sm:w-auto font-semibold px-8 shadow-lg hover:shadow-xl transition-all"
          >
            Start Discovering
          </Button>
        </motion.div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="py-8 px-4 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items List */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Shopping Cart</h1>
            <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                    {/* Item Image */}
                    <img 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"} 
                      alt={item.name} 
                      className="w-20 h-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate text-base mb-0.5">{item.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">From {item.storeName}</p>
                      
                      <div className="flex items-center justify-between">
                        {/* Price */}
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {item.price.toLocaleString()} KES
                        </span>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-primary dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-primary dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-all self-start md:self-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="w-full lg:w-[350px]">
          <Card className="p-6 sticky top-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Summary</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900 dark:text-white">{subtotal.toLocaleString()} KES</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="font-semibold text-emerald-600">FREE</span>
                ) : (
                  <span className="font-medium text-slate-900 dark:text-white">{deliveryFee.toLocaleString()} KES</span>
                )}
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Service Fee</span>
                <span className="font-medium text-slate-900 dark:text-white">{serviceFee.toLocaleString()} KES</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 my-4"></div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                <span>Grand Total</span>
                <span>{total.toLocaleString()} KES</span>
              </div>
            </div>

            {deliveryFee > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-xs text-primary mb-6 text-center font-medium">
                Add {(1500 - subtotal > 0 ? 1500 - subtotal : 0).toLocaleString()} KES more for FREE Delivery!
              </div>
            )}

            <Button
              onClick={() => navigate('/checkout')}
              className="w-full py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
