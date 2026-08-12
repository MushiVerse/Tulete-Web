import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useOrderSingleRealtime, useOrderTrackingRealtime, useLiveFlutterOrderTracking } from '../../orders/hooks/useOrderRealtime';
import { OrderStatus } from '../../orders/services/orderService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { 
  ChevronLeft, Phone, ShieldCheck, MapPin, Truck, 
  Map, MessageSquare, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { parseLaundryItems, getLaundryItemImage, getLaundryFallbackSvg } from '../../orders/pages/OrdersPage';
import { storeService } from '../../stores/services/storeService';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';

/**
 * Resolves the actual store image for a given order (never using product item images)
 */
export function getActualStoreImage(order: any, storeDoc?: any, mockStore?: any): string {
  // 1. Direct store image fields on order object
  const orderStoreImg = order?.storeImgURL || order?.storeImage || order?.storeImg || order?.storeLogo || order?.storePic;
  if (orderStoreImg && typeof orderStoreImg === 'string' && orderStoreImg.trim()) {
    return orderStoreImg.trim();
  }

  // 2. Firestore Store Document image
  const dbImg = storeDoc?.imgURL || storeDoc?.imgUrl || storeDoc?.image || storeDoc?.img;
  if (dbImg && typeof dbImg === 'string' && dbImg.trim()) {
    return dbImg.trim();
  }

  // 3. Mock store image
  const mockImg = mockStore?.imgURL || mockStore?.imgUrl || mockStore?.image;
  if (mockImg && typeof mockImg === 'string' && mockImg.trim()) {
    return mockImg.trim();
  }

  // 4. Fallback category-specific store avatars (never using product items images)
  const catName = String(order?.cat || order?.category || storeDoc?.category || storeDoc?.cat || '').toLowerCase();
  const storeNameLower = String(order?.storeName || storeDoc?.store || '').toLowerCase();

  if (catName.includes('nguo') || catName.includes('laund') || storeNameLower.includes('dobi') || storeNameLower.includes('laundry') || storeNameLower.includes('safi')) {
    return 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=300';
  }
  if (catName.includes('electr') || storeNameLower.includes('fundi') || storeNameLower.includes('power') || storeNameLower.includes('electric')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300';
  }
  if (catName.includes('beaut') || catName.includes('salon') || storeNameLower.includes('glam') || storeNameLower.includes('salon')) {
    return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300';
  }
  if (catName.includes('food') || catName.includes('restaur') || storeNameLower.includes('kibanda') || storeNameLower.includes('food') || storeNameLower.includes('diko')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300';
  }

  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';
}

export function OrderTrackingSkeleton() {
  return (
    <PageContainer>
      <ContentContainer size="md" className="space-y-6 pt-2">
        {/* Top Navigation & Title Shimmer */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-8 w-64 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>

        {/* Grid Layout Shimmer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Map Canvas Skeleton */}
            <Skeleton className="w-full h-[360px] rounded-3xl" />
            {/* Progress Stepper Skeleton */}
            <Skeleton className="w-full h-[260px] rounded-3xl" />
          </div>

          {/* Request Summary Sidepanel Skeleton */}
          <div className="space-y-6">
            <Skeleton className="w-full h-[240px] rounded-3xl" />
          </div>
        </div>
      </ContentContainer>
    </PageContainer>
  );
}

export const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shouldHideProgress = (location.state as any)?.hideProgress === true || searchParams.get('hideProgress') === 'true';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { order, isLoading: isOrderLoading } = useOrderSingleRealtime(id);
  const { tracking, isLoading: isTrackingLoading } = useOrderTrackingRealtime(id);
  const { liveItems, isLoading: isLiveLoading } = useLiveFlutterOrderTracking(order?.userId, id);

  const { data: dbStore } = useFirestoreDocument(
    ['store', order?.storeId || ''],
    storeService,
    order?.storeId || ''
  );
  const { data: dbStoresByName } = useFirestoreQuery(
    ['store_by_name', order?.storeName || ''],
    storeService,
    {
      filters: order?.storeName 
        ? [{ field: 'store', operator: '==' as const, value: order.storeName }]
        : []
    }
  );
  const dbStoreByName = dbStoresByName?.data && dbStoresByName.data.length > 0 ? dbStoresByName.data[0] : null;
  const realStoreDoc = dbStore || dbStoreByName;

  const mockStoreMatch = storeService.getMockStores().find(s => 
    (order?.storeId && s.id === order.storeId) || 
    (order?.storeName && s.store?.toLowerCase() === order.storeName.toLowerCase())
  );

  const actualStoreImg = getActualStoreImage(order, realStoreDoc, mockStoreMatch);

  const firstLiveItem = liveItems?.find(i => i.ordersts && Array.isArray(i.ordersts) && i.ordersts.length > 0)
    || liveItems?.find(i => i.status && i.status.toLowerCase() !== 'pending')
    || (liveItems && liveItems.length > 0 ? liveItems[0] : null);
  const rawStatus = firstLiveItem?.status || (firstLiveItem?.cancel ? 'Cancelled' : null) || order?.status || 'Order Placed';
  const isDone = Boolean(firstLiveItem?.deliveryDone || order?.deliveryDone);
  const isCanceled = Boolean(firstLiveItem?.cancel || order?.cancel || String(rawStatus).toLowerCase().includes('cancel'));

  const normalizeStatus = (statusStr: string, deliveryDone: boolean, cancel: boolean): OrderStatus => {
    if (cancel) return 'Cancelled';
    if (deliveryDone) return 'Delivered';
    const norm = (statusStr || '').toLowerCase().trim();
    if (norm === 'received' || norm === 'dobi received' || norm === 'order placed' || norm === 'pending') return 'Pending';
    if (norm === 'confirmed') return 'Confirmed';
    if (norm === 'preparing' || norm === 'washing' || norm === 'ironing' || norm === 'ready') return 'Preparing';
    if (norm === 'picked up' || norm === 'pickedup') return 'Picked Up';
    if (norm === 'on the way' || norm === 'ontheway') return 'On The Way';
    if (norm === 'delivered') return 'Delivered';
    if (norm === 'cancelled' || norm === 'canceled') return 'Cancelled';
    if (norm === 'failed') return 'Failed';
    return 'Pending';
  };

  const getRawFirestoreStatus = (statusStr: string, deliveryDone: boolean, cancel: boolean): string => {
    if (cancel) return 'Cancelled';
    if (deliveryDone) return 'Delivered';
    return statusStr || 'Pending';
  };

  const currentStatus = normalizeStatus(rawStatus, isDone, isCanceled);
  const statusBadgeText = getRawFirestoreStatus(rawStatus, isDone, isCanceled);
  const isFinished = currentStatus === 'Delivered' || currentStatus === 'Cancelled' || currentStatus === 'Failed';

  // Canvas Vector Map Rendering & Driver Physics Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let pulseAngle = 0;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 600;
      canvas.height = rect?.height || 400;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Coordinates in our mock screen space
    const padding = 60;
    
    const storeNode = { x: padding, y: canvas.height - padding, label: 'Store' };
    const userNode = { x: canvas.width - padding, y: padding, label: 'You' };

    const drawMap = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
          canvas.width = Math.floor(rect.width);
          canvas.height = Math.floor(rect.height);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const padding = 50;
      const storeNode = { x: padding, y: canvas.height - padding, label: 'Store' };
      const userNode = { x: Math.max(padding + 50, canvas.width - padding), y: padding, label: 'You' };
      
      // Draw gridlines (sleek HUD design)
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw secondary road paths
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Main Delivery highway
      ctx.beginPath();
      ctx.moveTo(storeNode.x, storeNode.y);
      // Curved road path for visual flavor
      const ctrlPt = { x: canvas.width / 2, y: canvas.height / 2 + 50 };
      ctx.quadraticCurveTo(ctrlPt.x, ctrlPt.y, userNode.x, userNode.y);
      ctx.stroke();

      // Pulsing highlight road
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.lineWidth = 12;
      ctx.stroke();

      // Pulsing rings at Store and User nodes
      pulseAngle += 0.05;
      const pulseRadius = 15 + Math.sin(pulseAngle) * 5;

      // Draw Store Node
      ctx.beginPath();
      ctx.arc(storeNode.x, storeNode.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(storeNode.x, storeNode.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw User Node
      ctx.beginPath();
      ctx.arc(userNode.x, userNode.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(userNode.x, userNode.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Labels
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(storeNode.label, storeNode.x - 14, storeNode.y + 22);
      ctx.fillText(userNode.label, userNode.x - 10, userNode.y + 22);

      // Render Driver Location if they are active
      if (tracking?.driverLocation) {
        // Map driver GPS coords ratio to canvas
        const storeGPS = { lat: -1.2635, lng: 36.8049 };
        const userGPS = { lat: -1.2894, lng: 36.7909 };

        const driverGPS = tracking.driverLocation;
        
        // Linear Interpolation calculation based on GPS ratio
        const totalLat = userGPS.lat - storeGPS.lat;
        const totalLng = userGPS.lng - storeGPS.lng;

        const currentLat = driverGPS.lat - storeGPS.lat;
        const currentLng = driverGPS.lng - storeGPS.lng;

        const ratio = totalLat !== 0 ? currentLat / totalLat : 0;
        
        // Calculate canvas coordinates along the quadratic curve path
        const t = Math.max(0, Math.min(1, ratio));
        
        // Quadratic bezier equation: B(t) = (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
        const driverX = Math.pow(1 - t, 2) * storeNode.x + 2 * (1 - t) * t * ctrlPt.x + Math.pow(t, 2) * userNode.x;
        const driverY = Math.pow(1 - t, 2) * storeNode.y + 2 * (1 - t) * t * ctrlPt.y + Math.pow(t, 2) * userNode.y;

        // Draw driver pulsing signal ring
        ctx.beginPath();
        ctx.arc(driverX, driverY, 20 + Math.sin(pulseAngle * 1.5) * 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';
        ctx.fill();

        // Draw driver marker (Car/Scooter)
        ctx.save();
        ctx.translate(driverX, driverY);
        // Angle rotate
        const angle = (driverGPS.bearing || 0) * (Math.PI / 180);
        ctx.rotate(angle);

        // Body
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.roundRect(-12, -7, 24, 14, 4);
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(4, -5, 4, 10);

        // Tires
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-8, -9, 4, 2);
        ctx.fillRect(4, -9, 4, 2);
        ctx.fillRect(-8, 7, 4, 2);
        ctx.fillRect(4, 7, 4, 2);

        ctx.restore();

        // Tag label
        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('Tulete Rider', driverX - 35, driverY - 16);
      }

      animationId = requestAnimationFrame(drawMap);
    };

    drawMap();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [tracking, order, isOrderLoading, isTrackingLoading]);

  if (isOrderLoading || isTrackingLoading || (isLiveLoading && !order)) {
    return <OrderTrackingSkeleton />;
  }

  if (!order) {
    return (
      <PageContainer>
        <ContentContainer size="md" className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">This order requested does not exist or has expired.</p>
          <Button onClick={() => navigate('/orders')}>View All Orders</Button>
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer size="md">
      <button 
        onClick={() => navigate('/orders')}
        className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors mb-6 cursor-pointer group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Orders
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Live Delivery Track
          </span>
          <h1 className="text-2xl font-extrabold text-foreground mt-3">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>

        {statusBadgeText.toLowerCase().trim() !== 'tap to track' && (order?.status || '').toLowerCase().trim() !== 'tap to track' && (
          <Badge className={`${currentStatus === 'Delivered' ? 'bg-emerald-500' : 'bg-primary'} text-white font-extrabold px-4 py-1.5 text-sm rounded-full shadow-md border-0 uppercase tracking-wide`}>
            {statusBadgeText}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map HUD View */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[360px] relative overflow-hidden border border-border bg-card shadow-md rounded-2xl flex flex-col">
            <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-slate-950/95 shadow-lg border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-850 dark:text-white">
              <Map className="w-4 h-4 text-primary animate-pulse" />
              Dodoma Delivery Coordinates Grid
            </div>

            <canvas ref={canvasRef} className="flex-1 w-full bg-muted cursor-crosshair" />

            {/* Custom bottom HUD detail */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[200px]">{order.deliveryLocation?.address || (order as any).location || 'Location'}</span>
              </div>
              {tracking?.estimatedDeliveryTime && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Est. Arrival:</span>
                  <span className="font-bold text-primary">15 mins</span>
                </div>
              )}
            </div>
          </Card>

          {/* Stepper Progression */}
          <Card className="p-6 border border-border shadow-sm bg-card">
            <h3 className="font-bold text-foreground text-base mb-6">Delivery Progress</h3>
              
              {(() => {
                const firstLiveItem = liveItems && liveItems.length > 0 ? liveItems[0] : null;

                let rawSts: string[] = [];
                let rawStsTime: string[] = [];

                if (firstLiveItem?.ordersts && Array.isArray(firstLiveItem.ordersts) && firstLiveItem.ordersts.length > 0) {
                  rawSts = firstLiveItem.ordersts;
                  rawStsTime = Array.isArray(firstLiveItem.orderststime) ? firstLiveItem.orderststime : [];
                } else if (order?.ordersts && Array.isArray(order.ordersts) && order.ordersts.length > 0) {
                  rawSts = order.ordersts;
                  rawStsTime = Array.isArray(order.orderststime) ? order.orderststime : [];
                } else {
                  const docSts = (firstLiveItem?.status || order?.status || 'Order Placed').trim();
                  rawSts = [docSts];
                  rawStsTime = [firstLiveItem?.time || order?.createdAt || ''];
                }

                const formatStatusTime = (timeStr?: any): string => {
                  if (!timeStr) return '';
                  try {
                    if (typeof timeStr === 'string') {
                      const d = new Date(timeStr);
                      if (!isNaN(d.getTime())) {
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      return timeStr.length > 16 ? timeStr.substring(11, 16) : timeStr;
                    }
                    if (typeof timeStr === 'number') {
                      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    if (typeof timeStr === 'object' && timeStr !== null) {
                      if (typeof timeStr.toDate === 'function') {
                        return timeStr.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      if (typeof timeStr.seconds === 'number') {
                        return new Date(timeStr.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    }
                  } catch (_) {}
                  return '';
                };

                return (
                  <div className="relative pl-6 border-l border-border space-y-6">
                    {rawSts.map((stsName, idx) => {
                      const isLatest = idx === rawSts.length - 1;
                      const timeFormatted = formatStatusTime(rawStsTime[idx]);

                      return (
                        <div key={idx} className="relative">
                          {/* Circle Indicator */}
                          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            isLatest
                              ? 'bg-primary border-primary shadow-md shadow-primary/30 scale-110' 
                              : 'bg-emerald-500 border-emerald-500'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {typeof stsName === 'string' ? stsName : String(stsName || '')}
                              </span>
                              {timeFormatted && (
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  {timeFormatted}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {idx === 0 ? 'Order registered in system' : `Status updated to ${stsName}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
        </div>

        {/* Info card sidepanel */}
        <div className="space-y-6">
          {/* Driver Contact details (Hidden for now) */}

          {/* Delivery Details & Items */}
          <Card className="p-6 border border-border shadow-sm bg-card">
            {/* Store Header Banner Image */}
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <img
                src={actualStoreImg}
                alt={order.storeName || 'Store'}
                className="w-12 h-12 rounded-2xl object-cover border border-border shrink-0 bg-muted shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120";
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="notranslate font-extrabold text-foreground text-sm truncate" translate="no">{order.storeName || 'Tulete Service'}</h4>
                <p className="text-[11px] text-muted-foreground font-semibold">Order #{order.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            <h3 className="font-bold text-foreground text-sm mb-3 uppercase tracking-wider">Request Summary</h3>
            
            {/* Order Items List with Image Thumbnails */}
            {(() => {
              let displayItems: { name: string; quantity: number; price?: number; imageUrl?: string; services?: string[] }[] = [];
              
              if (order.items && order.items.length > 0) {
                // Check if order.items contains a single pack summary string (e.g. "Suit (Iron) x2, Shirt (Wash) x3")
                const isSinglePackSummary = order.items.length === 1 && (order.items[0].name || '').includes(',');
                if (isSinglePackSummary) {
                  const { items: laundryBreakdown } = parseLaundryItems(order.items[0].name);
                  if (laundryBreakdown.length > 0) {
                    displayItems = laundryBreakdown.map(l => ({
                      name: l.name,
                      quantity: l.qty,
                      services: l.services,
                    }));
                  } else {
                    displayItems = order.items.map(i => ({
                      name: i.name,
                      quantity: i.quantity || 1,
                      price: i.price,
                      imageUrl: i.imageUrl || (i as any).imgUrl || (i as any).imgURL,
                    }));
                  }
                } else {
                  displayItems = order.items.map(i => ({
                    name: i.name,
                    quantity: i.quantity || 1,
                    price: i.price,
                    imageUrl: i.imageUrl || (i as any).imgUrl || (i as any).imgURL,
                  }));
                }
              } else {
                const laundryNameField = (order as any).name || '';
                const { items: laundryBreakdown } = parseLaundryItems(laundryNameField);
                displayItems = laundryBreakdown.map(l => ({
                  name: l.name,
                  quantity: l.qty,
                  services: l.services,
                }));
              }

              if (displayItems.length === 0) return null;

              return (
                <div className="space-y-2 mb-4 border-b border-border pb-4">
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
                    Order Items ({displayItems.reduce((acc, i) => acc + i.quantity, 0)})
                  </span>
                  {displayItems.map((item: any, idx: number) => {
                    const itemImg = getLaundryItemImage(item.name, item, order.items);
                    return (
                      <div key={idx} className="flex items-center gap-2.5 bg-muted/40 p-2 rounded-xl border border-border/40">
                        <img
                          src={itemImg}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 bg-card shadow-2xs"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = getLaundryFallbackSvg(item.name);
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="notranslate font-bold text-xs text-foreground truncate" translate="no">{item.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-semibold">Qty: {item.quantity}</span>
                            {item.services && item.services.map((srv: string, sIdx: number) => (
                              <span key={sIdx} className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                {srv}
                              </span>
                            ))}
                          </div>
                        </div>
                        {item.price !== undefined && (
                          <span className="font-extrabold text-xs text-foreground shrink-0">
                            {formatPrice(item.price * item.quantity)} {APP_SETTINGS.currency}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Store Name:</span>
                <span className="notranslate font-bold text-slate-950 dark:text-white" translate="no">{order.storeName}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Recipient Phone:</span>
                <span className="font-bold text-slate-950 dark:text-white">{order.contactPhone || order.no || 'Not provided'}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className={`font-semibold ${(order?.show === false || (liveItems && liveItems.length > 0 && liveItems.some(i => i.show === false))) ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'} flex items-center gap-1`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {(order?.show === false || (liveItems && liveItems.length > 0 && liveItems.some(i => i.show === false))) ? 'Paid' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground font-semibold">Total Price:</span>
                <span className="font-extrabold text-slate-950 dark:text-white text-sm">
                  {formatPrice(order.totalAmount || (order as any).total || (order as any).price || (liveItems && liveItems.length > 0 ? (liveItems[0].total || liveItems[0].price || 0) : 0))} {APP_SETTINGS.currency}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </ContentContainer>
    </PageContainer>
  );
};
