import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { orderService, Order } from '../../orders/services/orderService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Label } from '../../../shared/components/ui/Label';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { ShoppingCart, MapPin, Phone, CreditCard, ChevronLeft, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

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

  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressIndex, setAddressIndex] = useState(0);
  const [customAddress, setCustomAddress] = useState('');
  const [notes, setNotes] = useState('');
  const paymentMethod = 'Cash'; // Forced for now
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Laundry-specific state (mirrors Flutter MamboLaundry.dart / reorder.dart fields)
  const isLaundryOrder = items.some(i => i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry'));
  const [irondelivery, setIrondelivery] = useState(false);
  const [packagepickup, setPackagepickup] = useState(false);
  const [express, setExpress] = useState(false);
  const [deliverytime, setDeliverytime] = useState('');
  const [laundryInstructions, setLaundryInstructions] = useState('');

  if (items.length === 0) {
    return (
      <PageContainer>
        <ContentContainer size="full" className="flex flex-col items-center justify-center min-h-[70vh]">
          <ShoppingCart className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">No items in checkout</h2>
          <Button onClick={() => navigate('/discover')}>Discover Items</Button>
        </ContentContainer>
      </PageContainer>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (items.length === 0) {
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
          price: item.price, // TODO (Security): Price shouldn't be trusted from client, recalculate on backend via rules/functions.
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        totalAmount: total, // TODO (Security): Calculate total server-side
        status: 'Pending',
        storeId: items[0].storeId,
        storeName: items[0].storeName,
        deliveryLocation: {
          address: selectedLocation.address,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        },
        paymentMethod: 'Cash',
        paymentStatus: 'Pending',
        contactPhone: phoneNumber,
        no: phoneNumber, // Legacy backward compatibility for Flutter/Admin apps
        ...(notes && { notes }),
        // Laundry-specific fields
        ...(isLaundryOrder && {
          isLaundryOrder: true,
          irondelivery,
          packagepickup,
          express,
          ...(deliverytime && { deliverytime }),
          ...(laundryInstructions && { instructions: laundryInstructions }),
        }),
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
    <PageContainer>
      <ContentContainer size="lg">
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

          {/* Laundry-Specific Options (shown only for laundry orders — mirrors Flutter's MamboLaundry flow) */}
          {isLaundryOrder && (
            <Card className="p-6 border-2 border-primary/20 dark:border-primary/30 bg-primary/2 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                <span className="text-xl">🧺</span>
                Laundry Preferences
              </h2>

              <div className="space-y-4">
                {/* Service toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'iron', label: '🔥 Iron After Wash', sub: 'We press all items', state: irondelivery, set: setIrondelivery },
                    { key: 'pack', label: '📦 Package & Pickup', sub: 'We pick & deliver', state: packagepickup, set: setPackagepickup },
                    { key: 'express', label: '⚡ Express (24h)', sub: 'Priority turnaround', state: express, set: setExpress },
                  ].map(({ key, label, sub, state, set }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set(!state)}
                      className={`border rounded-xl p-3 text-left transition-all ${
                        state
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          state ? 'border-primary bg-primary' : 'border-slate-300'
                        }`}>
                          {state && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>
                    </button>
                  ))}
                </div>

                {/* Preferred pickup date/time */}
                <div className="space-y-2">
                  <Label htmlFor="deliverytime" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    📅 Preferred Pickup Date & Time
                  </Label>
                  <Input
                    id="deliverytime"
                    type="datetime-local"
                    value={deliverytime}
                    onChange={(e) => setDeliverytime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Special instructions */}
                <div className="space-y-2">
                  <Label htmlFor="laundry-instructions" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    📝 Special Instructions (Optional)
                  </Label>
                  <Textarea
                    id="laundry-instructions"
                    value={laundryInstructions}
                    onChange={(e) => setLaundryInstructions(e.target.value)}
                    placeholder="e.g. Separate whites from colours. Handle silk blouse gently."
                    rows={2}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Payment Method */}
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Method
            </h2>

            <div className="flex flex-col gap-3">
              <div 
                className="flex-1 border border-primary bg-primary/5 p-4 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-extrabold">POD</div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">Pay on Delivery</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Pay via Cash or M-Pesa when your order arrives.</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="font-bold text-primary">Note:</span> Online payment integrations (M-Pesa Express & Card) are currently in development and will be available in a future update!
                </p>
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
                    {(item.price * item.quantity).toLocaleString()} ${APP_SETTINGS.currency}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3 text-xs mb-6">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">{subtotal.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery</span>
                <span>{deliveryFee === 0 ? 'FREE' : `${deliveryFee.toLocaleString()} ${APP_SETTINGS.currency}`}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Service Fee</span>
                <span className="font-semibold text-slate-900 dark:text-white">{serviceFee.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span>{total.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || items.length === 0}
              className="w-full py-6 text-base font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5 animate-pulse" />
              Place Order & Track Live
            </Button>
          </Card>
        </div>
      </form>
      </ContentContainer>
    </PageContainer>
  );
};
