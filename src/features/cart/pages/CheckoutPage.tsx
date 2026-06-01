import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { orderService, Order } from '../../orders/services/orderService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Label } from '../../../shared/components/ui/Label';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { ShoppingCart, MapPin, Phone, CreditCard, ChevronLeft, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Nairobi coordinate hubs for high-fidelity order routing simulation
const LOCATIONS = [
  { address: 'Kilimani, Wood Avenue, Nairobi', lat: -1.2894, lng: 36.7909 },
  { address: 'Westlands, Ring Road, Nairobi', lat: -1.2635, lng: 36.8049 },
  { address: 'Nairobi CBD, Kenyatta Avenue', lat: -1.2821, lng: 36.8185 },
  { address: 'Hurlingham, Argwings Kodhek, Nairobi', lat: -1.2941, lng: 36.7981 },
];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, getTotals, clearCart } = useCartStore();
  const { subtotal, deliveryFee, serviceFee, total } = getTotals();

  const [phoneNumber, setPhoneNumber] = useState('+254 712 345678');
  const [addressIndex, setAddressIndex] = useState(0);
  const [customAddress, setCustomAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Cash'>('M-Pesa');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <ShoppingCart className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">No items in checkout</h2>
        <Button onClick={() => navigate('/discover')}>Discover Items</Button>
      </PageWrapper>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedLocation = customAddress 
        ? { address: customAddress, lat: -1.2894, lng: 36.7909 } // default coords
        : LOCATIONS[addressIndex];

      // Standard mock store coordinate in Westlands
      const storeLocation = { lat: -1.2635, lng: 36.8049 };

      const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.id,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        totalAmount: total,
        status: 'Pending',
        storeId: items[0].storeId,
        storeName: items[0].storeName,
        deliveryLocation: {
          address: selectedLocation.address,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        },
        paymentMethod,
        paymentStatus: paymentMethod === 'M-Pesa' ? 'Paid' : 'Pending',
        notes: notes || undefined,
      };

      // Create order in firestore
      const createdOrder = await orderService.create(orderPayload);

      // Start background simulation to dynamically route the driver and update order status in Firestore!
      orderService.simulateOrderLifecycle(
        createdOrder.id,
        storeLocation,
        { lat: selectedLocation.lat, lng: selectedLocation.lng }
      );

      // Clear the local shopping cart
      clearCart();

      // Go to real-time tracking page
      navigate(`/tracking/${createdOrder.id}`);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper className="py-8 px-4 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate('/cart')}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Cart
      </button>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* Delivery Location Section */}
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              Delivery Location
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {LOCATIONS.map((loc, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    setAddressIndex(i);
                    setCustomAddress('');
                  }}
                  className={`border p-4 rounded-xl cursor-pointer transition-all ${
                    addressIndex === i && !customAddress
                      ? 'border-primary bg-primary/5 text-primary-foreground' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">Location Option {i + 1}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{loc.address}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-address" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Or enter custom Nairobi address
              </Label>
              <Input
                id="custom-address"
                placeholder="e.g. State House Road, Nairobi"
                value={customAddress}
                onChange={(e) => {
                  setCustomAddress(e.target.value);
                  setAddressIndex(-1);
                }}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </Card>

          {/* Contact Details */}
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <Phone className="w-5 h-5 text-primary" />
              Contact Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recipient Mobile Number
                </Label>
                <Input
                  id="phone"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Delivery Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Leave package with the gate attendant."
                  rows={1}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-h-[42px]"
                />
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Method
            </h2>

            <div className="flex gap-4">
              <div 
                onClick={() => setPaymentMethod('M-Pesa')}
                className={`flex-1 border p-4 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'M-Pesa' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-extrabold">M</div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">M-Pesa Express</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'M-Pesa' ? 'border-primary' : 'border-slate-300'}`}>
                  {paymentMethod === 'M-Pesa' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>

              <div 
                onClick={() => setPaymentMethod('Cash')}
                className={`flex-1 border p-4 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'Cash' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs font-extrabold">C</div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Cash on Delivery</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'Cash' ? 'border-primary' : 'border-slate-300'}`}>
                  {paymentMethod === 'Cash' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Info Sidebar */}
        <div className="w-full lg:w-[350px]">
          <Card className="p-6 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Order</h2>
            
            <div className="max-h-[220px] overflow-y-auto space-y-3 mb-6 pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 items-center">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100"} 
                    alt={item.name} 
                    className="w-12 h-12 rounded-lg object-cover bg-white flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {(item.price * item.quantity).toLocaleString()} KES
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3 text-xs mb-6">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">{subtotal.toLocaleString()} KES</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery</span>
                <span>{deliveryFee === 0 ? 'FREE' : `${deliveryFee.toLocaleString()} KES`}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Service Fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">{serviceFee.toLocaleString()} KES</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span>{total.toLocaleString()} KES</span>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full py-6 text-base font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5 animate-pulse" />
              Place Order & Track Live
            </Button>
          </Card>
        </div>
      </form>
    </PageWrapper>
  );
};
