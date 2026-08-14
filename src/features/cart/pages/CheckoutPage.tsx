import { formatPrice, roundTZSPrice } from '../../../shared/utils/formatPrice';
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
import { ShoppingCart, Phone, CreditCard, ChevronLeft, Truck, Sparkles, Zap, Clock, Smartphone, Globe, CheckCircle2, AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import { APP_SETTINGS } from '@/core/config/settings';
import { useLocationStore, SavedLocation } from '../../location/store/useLocationStore';
import { smsService } from '../../../services/smsService';
import { snippeService, formatSnippePhoneNumber } from '../../payment/services/snippeService';

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
  const { items, getTotals, clearCart, removeSelectedItems, laundryPreferences, getDynamicItemPrices } = useCartStore();
  const selectedItems = items.filter((i) => i.isSelected !== false);
  const { subtotal, total, deliveryFee, expressFee = 0, pickupFee = 0, serviceFee = 0 } = getTotals();

  const isLaundryOrder = selectedItems.some(i => i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry') || i.isLaundry);
  const { deliverytime, instructions: laundryInstructions } = laundryPreferences || {};

  // Phone state with UX for edit vs view
  const [phoneNumber, setPhoneNumber] = useState(savedPhoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState(!savedPhoneNumber);
  const { currentLocation } = useLocationStore();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setDeliveryRation] = React.useState<number>(1000);

  // Payment Method Selection State
  const [paymentMethodType, setPaymentMethodType] = useState<'POD' | 'MOBILE_MONEY' | 'CARD'>('POD');
  const [mobileNetwork, setMobileNetwork] = useState<'mpesa' | 'airtel' | 'yas' | 'halotel'>('mpesa');
  const [mobilePaymentPhone, setMobilePaymentPhone] = useState(savedPhoneNumber || '');

  // USSD modal state
  const [ussdModalOpen, setUssdModalOpen] = useState(false);
  const [ussdStatus, setUssdStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [ussdMessage, setUssdMessage] = useState('');
  const [createdOrderIdForModal, setCreatedOrderIdForModal] = useState('');

  // Fetch delivery ration on mount
  React.useEffect(() => {
    orderService.getDeliveryRation().then(ration => {
      setDeliveryRation(ration);
    });
  }, []);

  const selectedLocation = currentLocation || DEFAULT_CENTER;

  // Delivery fee is already baked into the total via useCartStore.
  const finalTotalWithDelivery = total;
  const computedDeliveryFee = deliveryFee;

  if (selectedItems.length === 0) {
    return (
      <PageContainer>
        <ContentContainer size="full" className="flex flex-col items-center justify-center min-h-[70vh]">
          <ShoppingCart className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">No items selected for checkout</h2>
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

    if (selectedItems.length === 0) {
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
      const inventoryErrors = await orderService.validateInventory(selectedItems);
      if (inventoryErrors.length > 0) {
        alert("Checkout Failed:\n\n" + inventoryErrors.join('\n'));
        setIsSubmitting(false);
        return;
      }

      const dynamicPrices = getDynamicItemPrices();

      // Group selected items by store / laundry pack
      const storeGroups: { [key: string]: { storeId: string; storeName: string; isLaundry: boolean; items: typeof selectedItems } } = {};
      selectedItems.forEach(item => {
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

      const orderPaymentMethod: Order['paymentMethod'] = 
        paymentMethodType === 'CARD' ? 'Card' : (paymentMethodType === 'MOBILE_MONEY' ? 'M-Pesa' : 'Cash');

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
        const groupTotalAmount = roundTZSPrice(groupSubtotal + groupExtraLaundryCharges);

        const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.id,
          email: user.email || '',
          uname: user.displayName || 'Web User',
          items: group.items.map(item => {
            const rowTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);
            const unitPrice = item.quantity > 0 ? roundTZSPrice(rowTotal / item.quantity) : roundTZSPrice(item.price);
            
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
          paymentMethod: orderPaymentMethod,
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

      // Execute specific payment method flow
      if (paymentMethodType === 'POD') {
        removeSelectedItems();
        if (createdOrderIds.length > 0) {
          navigate(`/tracking/${createdOrderIds[0]}`);
        } else {
          navigate('/orders');
        }
      } else if (paymentMethodType === 'MOBILE_MONEY') {
        const targetPhone = mobilePaymentPhone.trim() || activePhone;
        const mainOrderId = createdOrderIds[0];
        setCreatedOrderIdForModal(mainOrderId);
        setUssdModalOpen(true);
        setUssdStatus('pending');
        setUssdMessage(`Initiating Mobile Money USSD Push to ${formatSnippePhoneNumber(targetPhone)}...`);

        const res = await snippeService.createMobilePayment({
          amount: finalTotalWithDelivery,
          phoneNumber: targetPhone,
          firstname: user.displayName?.split(' ')[0] || 'Customer',
          lastname: user.displayName?.split(' ')[1] || 'User',
          email: user.email || '',
          orderId: mainOrderId,
          network: mobileNetwork,
        });

        if (res.status === 'success' && res.data?.reference) {
          const ref = res.data.reference;
          setUssdMessage(`USSD Push sent to ${formatSnippePhoneNumber(targetPhone)}! Please check your phone screen and enter your PIN to authorize payment.`);
          
          let pollCount = 0;
          const maxPolls = 15;
          const pollInterval = setInterval(async () => {
            pollCount++;
            const statusRes = await snippeService.checkPaymentStatus(ref);
            if (statusRes.data?.status === 'completed') {
              clearInterval(pollInterval);
              setUssdStatus('completed');
              setUssdMessage('Payment received successfully! Your order is confirmed.');
              await orderService.updatePaymentStatus(mainOrderId, 'Paid', ref);
              removeSelectedItems();
              setTimeout(() => {
                setUssdModalOpen(false);
                navigate(`/tracking/${mainOrderId}`);
              }, 2000);
            } else if (statusRes.data?.status === 'failed' || statusRes.data?.status === 'cancelled' || statusRes.data?.status === 'expired') {
              clearInterval(pollInterval);
              setUssdStatus('failed');
              setUssdMessage(statusRes.message || 'Payment request was not completed.');
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              setUssdMessage('USSD prompt sent. Once you complete entering your PIN, your payment status will automatically update on live tracking.');
            }
          }, 3000);
        } else {
          setUssdStatus('failed');
          setUssdMessage(res.message || 'Could not initiate USSD Push notification. You can still track your order and pay on delivery.');
        }
      } else if (paymentMethodType === 'CARD') {
        const mainOrderId = createdOrderIds[0];
        const res = await snippeService.createPaymentSession({
          amount: finalTotalWithDelivery,
          customer: {
            firstname: user.displayName?.split(' ')[0] || 'Customer',
            lastname: user.displayName?.split(' ')[1] || 'User',
            email: user.email || '',
          },
          orderId: mainOrderId,
        });

        if (res.status === 'success' && res.data?.checkout_url) {
          clearCart();
          window.location.href = res.data.checkout_url;
        } else {
          alert(res.message || 'Could not open Snippe online payment portal. Proceeding to order tracking.');
          clearCart();
          navigate(`/tracking/${mainOrderId}`);
        }
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

            {/* Payment Method - Snippe Online Payment Integration */}
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Method
              </h2>

              <div className="flex flex-col gap-3">
                {/* Pay on Delivery Option */}
                <div
                  onClick={() => setPaymentMethodType('POD')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethodType === 'POD'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-xs">
                      POD
                    </div>
                    <div>
                      <span className="font-bold text-foreground text-sm block">Pay on Delivery</span>
                      <span className="text-xs text-muted-foreground">Pay via Cash or M-Pesa when your order arrives.</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMethodType === 'POD' ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {paymentMethodType === 'POD' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Snippe Mobile Money USSD Push Option */}
                <div
                  onClick={() => setPaymentMethodType('MOBILE_MONEY')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 ${
                    paymentMethodType === 'MOBILE_MONEY'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-600 dark:bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">M-Pesa Express & Mobile Money</span>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300/80">
                            Instant USSD Push
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">Automated PIN prompt on <span className="notranslate" translate="no">M-Pesa</span>, <span className="notranslate" translate="no">Airtel Money</span>, <span className="notranslate" translate="no">Mixx by Yas</span>, <span className="notranslate" translate="no">Halotel</span></span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethodType === 'MOBILE_MONEY' ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {paymentMethodType === 'MOBILE_MONEY' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Network Badges & Mobile Input when selected */}
                  {paymentMethodType === 'MOBILE_MONEY' && (
                    <div className="pt-3 border-t border-border/60 flex flex-col gap-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-muted-foreground font-medium text-[11px]">Select Network:</span>
                        {[
                          { id: 'mpesa', name: 'M-Pesa', color: 'bg-red-600 text-white' },
                          { id: 'airtel', name: 'Airtel Money', color: 'bg-red-700 text-white' },
                          { id: 'yas', name: 'Mixx by Yas', color: 'bg-blue-600 text-white' },
                          { id: 'halotel', name: 'Halotel', color: 'bg-orange-500 text-white' },
                        ].map((net) => (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => setMobileNetwork(net.id as any)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                              mobileNetwork === net.id
                                ? `${net.color} border-transparent shadow-xs scale-105`
                                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                            }`}
                          >
                            <span className="notranslate" translate="no">{net.name}</span>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="payPhone" className="text-xs font-semibold text-muted-foreground">
                          Mobile Money Phone Number for USSD Prompt
                        </Label>
                        <Input
                          id="payPhone"
                          value={mobilePaymentPhone}
                          onChange={(e) => setMobilePaymentPhone(e.target.value)}
                          placeholder="e.g. 0781000000 or 255781000000"
                          className="bg-background border-border text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          You will receive a prompt on your phone screen asking you to enter your PIN to confirm payment of <span className="font-bold text-foreground">{formatPrice(finalTotalWithDelivery)} TZS</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Snippe Card & Hosted Payment Session Option */}
                <div
                  onClick={() => setPaymentMethodType('CARD')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethodType === 'CARD'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xs">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">Credit / Debit Card & Online Checkout</span>
                        <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-300/80">
                          Snippe Gateway
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Secure online checkout via Visa, MasterCard & digital wallets</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMethodType === 'CARD' ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {paymentMethodType === 'CARD' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Powered by Snippe Payments API
                  </span>
                  <span className="font-semibold text-[11px] text-primary">Encrypted 256-bit</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Order Info Sidebar */}
          <div className="w-full lg:w-[350px]">
            <Card className="p-6 border border-border bg-muted shadow-md">
              <h2 className="text-xl font-bold text-foreground mb-4">Your Order</h2>

              <div className="max-h-[220px] overflow-y-auto space-y-3 mb-6 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scrollbar-none">
                {selectedItems.map((item) => (
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
                disabled={isSubmitting || selectedItems.length === 0}
                className="w-full py-6 text-base font-bold shadow-lg flex items-center justify-center gap-2"
              >
                <Truck className="w-5 h-5 animate-pulse" />
                {paymentMethodType === 'MOBILE_MONEY'
                  ? 'Pay via USSD & Place Order'
                  : (paymentMethodType === 'CARD' ? 'Proceed to Online Payment' : 'Place Order & Track Live')}
              </Button>
            </Card>
          </div>
        </form>

        {/* USSD Mobile Money Push Dialog / Modal */}
        {ussdModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => {
                  setUssdModalOpen(false);
                  removeSelectedItems();
                  if (createdOrderIdForModal) {
                    navigate(`/tracking/${createdOrderIdForModal}`);
                  }
                }}
                className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center py-4 space-y-4">
                {ussdStatus === 'pending' && (
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
                {ussdStatus === 'completed' && (
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )}
                {ussdStatus === 'failed' && (
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                )}

                <h3 className="text-lg font-extrabold text-foreground">
                  {ussdStatus === 'pending' && 'Waiting for USSD Payment Authorization'}
                  {ussdStatus === 'completed' && 'Payment Completed!'}
                  {ussdStatus === 'failed' && 'Payment Notification'}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ussdMessage}
                </p>

                <div className="pt-2 w-full flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setUssdModalOpen(false);
                      removeSelectedItems();
                      if (createdOrderIdForModal) {
                        navigate(`/tracking/${createdOrderIdForModal}`);
                      }
                    }}
                    className="w-full"
                  >
                    Track Order Live
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </ContentContainer>
    </PageContainer>
  );
};
