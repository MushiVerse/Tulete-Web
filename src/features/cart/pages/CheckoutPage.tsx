import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, getStoreDeliveryFee, isLaundryItem, isFoodItem, isProductItem } from '../store/useCartStore';
import { orderService, Order } from '../../orders/services/orderService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Label } from '../../../shared/components/ui/Label';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { ShoppingCart, MapPin, Phone, CreditCard, ChevronLeft, Truck, Sparkles, Zap, Clock } from 'lucide-react';
import { APP_SETTINGS } from '@/core/config/settings';
import { locationService } from '../../location/services/locationService';
import { useLocationStore, SavedLocation } from '../../location/store/useLocationStore';
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

// Default mock center if no location is selected
const DEFAULT_CENTER: SavedLocation = { id: 'default', lat: -6.1630, lng: 35.7516, address: 'Dodoma, Tanzania', lastUsedAt: Date.now() };

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, savedPhoneNumber, savePhoneNumber } = useAuthStore();
  const { items, getTotals, clearCart, laundryPreferences, getDynamicItemPrices } = useCartStore();
  const { subtotal, total, deliveryFee, expressFee = 0, pickupFee = 0, serviceFee = 0 } = getTotals();

  const isLaundryOrder = items.some(i => i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry') || i.isLaundry);
  const { deliverytime, instructions: laundryInstructions } = laundryPreferences || {};

  // Phone state with UX for edit vs view
  const [phoneNumber, setPhoneNumber] = useState(savedPhoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState(!savedPhoneNumber);
  const { currentLocation } = useLocationStore();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryRation, setDeliveryRation] = React.useState<number>(1000);

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

      const dynamicPrices = getDynamicItemPrices();

      // Group items by store / laundry pack
      const storeGroups: { [key: string]: { storeId: string; storeName: string; isLaundry: boolean; items: typeof items } } = {};
      items.forEach(item => {
        const isLaundry = isLaundryItem(item) || item.storeId === 'laundry';
        const rawSId = item.storeId && item.storeId !== 'unknown' ? item.storeId : null;
        const rawSName = item.storeName && item.storeName !== 'Unknown Store' ? item.storeName : null;

        const groupKey = isLaundry ? 'laundry_pack' : (rawSId || rawSName || item.productId);
        const sName = isLaundry ? (item.storeName || 'Laundry Services') : (rawSName || rawSId || 'Store Order');

        if (!storeGroups[groupKey]) {
          storeGroups[groupKey] = {
            storeId: rawSId || groupKey,
            storeName: sName,
            isLaundry: isLaundry,
            items: []
          };
        }
        storeGroups[groupKey].items.push(item);
      });

      const createdOrderIds: string[] = [];
      const numGroups = Object.keys(storeGroups).length;

      // Create a separate order per store group
      for (const groupKey of Object.keys(storeGroups)) {
        const group = storeGroups[groupKey];
        const isLaundryGroup = group.isLaundry;

        const groupSubtotal = group.items.reduce((sum, item) => {
          const rowTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);
          return sum + rowTotal;
        }, 0);

        const groupDeliveryFee = isLaundryGroup
          ? Math.round(computedDeliveryFee / numGroups)
          : getStoreDeliveryFee(group.items, selectedLocation);
        const groupExtraLaundryCharges = isLaundryGroup ? (expressFee + pickupFee + serviceFee) : 0;
        const groupTotalAmount = Math.round(groupSubtotal + groupExtraLaundryCharges);

        const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.id,
          email: user.email || '',
          uname: user.displayName || 'Web User',
          items: group.items.map(item => {
            const rowTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);
            const unitPrice = item.quantity > 0 ? Math.round(rowTotal / item.quantity) : item.price;
            
            const isPickUp = item.isDeliverySelected === false || (item as any).packagepickup === true;
            const isFd = isFoodItem(item);
            const isProd = isProductItem(item);

            let slotValue: string;
            if (isPickUp) {
              slotValue = 'Pickup';
            } else if (isProd) {
              slotValue = 'Product';
            } else if (isFd) {
              const hour = new Date().getHours();
              const bVal = String((item as any).brand || (item as any).pbrand || (item as any).FBrand || (item as any).LBrand || '').toLowerCase().trim();
              const defaultFoodSlot = bVal === 'now' ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
              slotValue = (item as any).deliverySlot || defaultFoodSlot;
            } else {
              slotValue = 'Product';
            }

            return {
              productId: item.productId,
              name: item.name,
              price: unitPrice,
              quantity: item.quantity,
              imageUrl: item.imageUrl || '',
              cat: isProd ? 'Product' : (item.cat || (item as any).category || ''),
              deliverySlot: slotValue,
              isDeliverySelected: item.isDeliverySelected,
              packagepickup: (item as any).packagepickup ?? (item.isDeliverySelected === false),
              ironingSelected: (item as any).ironingSelected || false,
              packagingSelected: (item as any).packagingSelected || false,
              vipSelected: (item as any).vipSelected || false,
            };
          }),
          totalAmount: groupTotalAmount,
          deliveryFee: groupDeliveryFee,
          status: 'Pending',
          storeId: group.storeId,
          storeName: group.storeName,
          locationImgUrl: selectedLocation.imageUrl || '',
          deliveryLocation: {
            address: selectedLocation.address,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            specificInstructions: selectedLocation.specificInstructions,
            locationImgUrl: selectedLocation.imageUrl || '',
          },
          paymentMethod: 'Cash',
          paymentStatus: 'Pending',
          contactPhone: activePhone,
          notes: notes,
          deliverytime: (() => {
            if (isLaundryGroup) return 'Pickup';
            const isAllPickup = group.items.every(item => item.isDeliverySelected === false || (item as any).packagepickup === true);
            if (isAllPickup) return 'Pickup';
            
            const hasFoodItemInGroup = group.items.some(item => isFoodItem(item));
            if (hasFoodItemInGroup) {
              const foodItem = group.items.find(item => isFoodItem(item));
              return foodItem?.deliverySlot || 'ASAP';
            }

            return 'Product';
          })(),
          no: activePhone,
          ...(isLaundryGroup && {
            isLaundryOrder: true,
            instructions: (() => {
              let instr = laundryInstructions || '';
              if (deliverytime) {
                const timeFormatted = isNaN(new Date(deliverytime).getTime())
                  ? deliverytime
                  : new Date(deliverytime).toLocaleString();
                const pickupStr = `Preferred Pickup Time: ${timeFormatted}`;
                instr = instr ? `${instr}\n[${pickupStr}]` : `[${pickupStr}]`;
              }
              return instr;
            })(),
          }),
        };

        // Create main order document in 'orders'
        const createdOrder = await orderService.create(orderPayload);
        createdOrderIds.push(createdOrder.id);

        // If laundry pack, create live flutter orders for BOTH 'orders' and 'newcomfirmedorders'
        await orderService.createLiveFlutterOrders(orderPayload, createdOrder.id);

        // Send SMS notification
        await smsService.sendAdminOrderNotification(orderPayload);

        // Initialize order tracking
        await orderService.initializeOrderTracking(createdOrder.id);
      }

      // Clear local cart
      clearCart();

      // Go to real-time tracking or orders list
      if (createdOrderIds.length > 0) {
        navigate(`/tracking/${createdOrderIds[0]}`);
      } else {
        navigate('/orders');
      }
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
                {isLaundryOrder && serviceFee > 0 && (
                  <div className="flex justify-between text-primary font-bold text-xs">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Service Charge (5%)</span>
                    <span>+{formatPrice(serviceFee)} {APP_SETTINGS.currency}</span>
                  </div>
                )}
                {expressFee > 0 && (
                  <div className="flex justify-between text-primary font-bold text-xs">
                    <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary fill-primary/20" /> Express Charges</span>
                    <span>+{formatPrice(expressFee)} {APP_SETTINGS.currency}</span>
                  </div>
                )}
                {pickupFee > 0 && (
                  <div className="flex justify-between text-primary font-bold text-xs">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Preferred Pickup Charge</span>
                    <span>+{formatPrice(pickupFee)} {APP_SETTINGS.currency}</span>
                  </div>
                )}
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
      </ContentContainer>
    </PageContainer>
  );
};
