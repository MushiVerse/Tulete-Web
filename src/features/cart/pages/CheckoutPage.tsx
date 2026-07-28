import { formatPrice } from '../../../shared/utils/formatPrice';
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
import { APP_SETTINGS } from '@/core/config/settings';
import { locationService } from '../../location/services/locationService';
import { useLocationStore } from '../../location/store/useLocationStore';
import { smsService } from '../../../services/smsService';

const CheckoutItemRow = ({ item }: { item: any }) => {
  useLocationStore((state) => state.currentLocation);
  const getDynamicItemPrices = useCartStore((state) => state.getDynamicItemPrices);
  const dynamicPrices = getDynamicItemPrices();
  const rowTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);

  return (
    <div className="flex gap-3 items-center">
      <img
        src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100"}
        alt={item.name}
        className="w-10 h-10 rounded object-cover bg-slate-100 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
      </div>
      <span className="font-bold text-xs text-foreground">
        {formatPrice(rowTotal)} {APP_SETTINGS.currency}
      </span>
    </div>
  );
};

import { LocationPickerModal, GOOGLE_MAPS_LIBRARIES } from '../../location/components/LocationPickerModal';
import { MiniMapPreview } from '../../location/components/MiniMapPreview';
import { useJsApiLoader } from '@react-google-maps/api';

// Default mock center if no location is selected
const DEFAULT_CENTER = { lat: -6.1630, lng: 35.7516, address: 'Dodoma, Tanzania' };

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, savedPhoneNumber, savePhoneNumber } = useAuthStore();
  const { items, getTotals, clearCart, laundryPreferences, getDynamicItemPrices } = useCartStore();
  const { subtotal, total, deliveryFee } = getTotals();

  const isLaundryOrder = items.some(i => i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry') || i.isLaundry);
  const { deliverytime, instructions: laundryInstructions } = laundryPreferences || {};

  // Phone state with UX for edit vs view
  const [phoneNumber, setPhoneNumber] = useState(savedPhoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState(!savedPhoneNumber);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const { currentLocation } = useLocationStore();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryRation, setDeliveryRation] = React.useState<number>(1000);

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Fetch delivery ration on mount
  React.useEffect(() => {
    orderService.getDeliveryRation().then(ration => {
      setDeliveryRation(ration);
    });
  }, []);

  // Auto-open modal logic moved to MainLayout to enforce global location setting

  const selectedLocation = currentLocation || DEFAULT_CENTER;

  // Standard mock store coordinate in Westlands
  const storeLocation = { lat: -1.2635, lng: 36.8049 };

  // Delivery fee is already baked into the total via useCartStore.
  const finalTotalWithDelivery = total;
  const computedDeliveryFee = deliveryFee;

  if (items.length === 0) {
    return (
      <PageContainer>
        <ContentContainer size="full" className="flex flex-col items-center justify-center min-h-[70vh]">
          <ShoppingCart className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">No items in checkout</h2>
          <Button onClick={() => navigate('/explore')}>Discover Items</Button>
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

    // Auto-save phone number if customer entered text without explicitly clicking "Save"
    const activePhone = phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : (savedPhoneNumber || '');
    if (phoneNumber && phoneNumber.trim()) {
      savePhoneNumber(phoneNumber.trim());
      setIsEditingPhone(false);
    }

    setIsSubmitting(true);

    try {
      // 1. Validate Live Inventory / Stock constraint
      const inventoryErrors = await orderService.validateInventory(items);
      if (inventoryErrors.length > 0) {
        alert("Checkout Failed:\n\n" + inventoryErrors.join('\n'));
        setIsSubmitting(false);
        return;
      }

      // Dynamic delivery fee is already computed in the render scope
      const dynamicPrices = getDynamicItemPrices();
      const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.id,
        email: user.email || '',
        uname: user.displayName || 'Web User',
        items: items.map(item => {
          const rowTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);
          const unitPrice = item.quantity > 0 ? Math.round(rowTotal / item.quantity) : item.price;
          return {
            productId: item.productId,
            name: item.name,
            price: unitPrice,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            cat: item.cat,
          };
        }),
        totalAmount: finalTotalWithDelivery, // Computed with global modifiers and dynamic distance delivery fee
        deliveryFee: computedDeliveryFee,
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
        contactPhone: activePhone,
        notes: deliverytime ? `${notes}\n[Preferred Time: ${new Date(deliverytime).toLocaleString()}]` : notes,
        deliverytime: isLaundryOrder ? 'Pickup' : 'ASAP',
        no: activePhone, // Legacy backward compatibility for Flutter/Admin apps
        // Laundry-specific fields
        ...(isLaundryOrder && {
          isLaundryOrder: true,
          ...(laundryInstructions && { instructions: laundryInstructions }),
        }),
      };

      // Create order in firestore (Web App format)
      const createdOrder = await orderService.create(orderPayload);

      // Create orders in firestore (Live Flutter Format: 'newcomfirmedorders')
      await orderService.createLiveFlutterOrders(orderPayload, createdOrder.id);

      // Send SMS notification to Admin via KilaKona
      await smsService.sendAdminOrderNotification(orderPayload);

      // Removed background simulation to allow the Flutter Admin app to actually process the order in real-time.
      await orderService.initializeOrderTracking(createdOrder.id);

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
          className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors mb-6 cursor-pointer group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </button>

        <h1 className="text-3xl font-extrabold text-foreground mb-8">Checkout</h1>

        <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Delivery Location Section */}
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                Delivery Location
              </h2>

              {currentLocation ? (
                <div className="border border-primary bg-primary/5 p-4 rounded-xl mb-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <p className="font-extrabold text-sm text-foreground mb-1">Selected Destination</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentLocation.address}</p>
                      {currentLocation.specificInstructions && (
                        <p className="text-xs text-slate-500 mt-1 italic font-medium bg-white/50 dark:bg-black/20 p-2 rounded-md">
                          Note: {currentLocation.specificInstructions}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="font-bold shadow-sm whitespace-nowrap"
                    >
                      Change
                    </Button>
                  </div>

                  {/* Visual Map Preview */}
                  <MiniMapPreview isLoaded={isMapLoaded} lat={currentLocation.lat} lng={currentLocation.lng} />
                </div>
              ) : (
                <div className="bg-muted p-6 rounded-xl text-center border border-dashed border-border mb-4">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-foreground font-medium mb-4">No delivery location set</p>
                  <Button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="font-bold shadow-md"
                  >
                    Set Delivery Location
                  </Button>
                </div>
              )}

              {!currentLocation && (
                <p className="text-xs text-destructive font-semibold flex justify-center">
                  * A delivery location is required
                </p>
              )}
            </Card>

            {/* Contact Details */}
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                <Phone className="w-5 h-5 text-primary" />
                Contact Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recipient Mobile Number
                  </Label>
                  {isEditingPhone ? (
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+255 7XX XXX XXX"
                        className="bg-card border-border flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (phoneNumber.trim()) {
                            savePhoneNumber(phoneNumber.trim());
                            setIsEditingPhone(false);
                          }
                        }}
                      >
                        Save
                      </Button>
                      {savedPhoneNumber && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setPhoneNumber(savedPhoneNumber);
                            setIsEditingPhone(false);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border gap-2 flex-wrap sm:flex-nowrap min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        <span className="font-bold text-sm text-foreground truncate">{savedPhoneNumber}</span>
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs">
                          ✓ Saved
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="shrink-0 cursor-pointer hover:bg-muted-foreground/10" onClick={() => setIsEditingPhone(true)}>
                        Change
                      </Button>
                    </div>
                  )}
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
                    className="bg-card border-border min-h-[42px] resize-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  />
                </div>
              </div>
            </Card>

            {/* Contact Details */}
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
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
                      <span className="font-bold text-foreground text-sm block">Pay on Delivery</span>
                      <span className="text-xs text-muted-foreground">Pay via Cash or M-Pesa when your order arrives.</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground font-medium">
                    <span className="font-bold text-primary">Note:</span> Online payment integrations (M-Pesa Express & Card) are currently in development and will be available in a future update!
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Order Info Sidebar */}
          <div className="w-full lg:w-[350px]">
            <Card className="p-6 border border-border bg-muted shadow-md">
              <h2 className="text-xl font-bold text-foreground mb-4">Your Order</h2>

              <div className="max-h-[220px] overflow-y-auto space-y-3 mb-6 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scrollbar-none">
                {items.map((item) => (
                  <CheckoutItemRow key={item.productId} item={item} />
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground font-semibold text-xs">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)} {APP_SETTINGS.currency}</span>
                </div>
                {/* Delivery Fee hidden per request, sum remains identical */}
                <div className="flex justify-between items-center text-lg font-extrabold text-foreground border-t border-border/50 pt-3">
                  <span>Total to Pay</span>
                  <span className="text-primary">{formatPrice(finalTotalWithDelivery)} {APP_SETTINGS.currency}</span>
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
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          isLoaded={isMapLoaded}
        />
      </ContentContainer>
    </PageContainer>
  );
};
