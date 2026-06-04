import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderSingleRealtime, useOrderTrackingRealtime } from '../../orders/hooks/useOrderRealtime';
import { OrderStatus } from '../../orders/services/orderService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  ChevronLeft, Phone, ShieldCheck, MapPin, Truck, 
  Map, MessageSquare, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'Pending', label: 'Order Placed', desc: 'Awaiting store confirmation' },
  { status: 'Confirmed', label: 'Confirmed', desc: 'Store has accepted request' },
  { status: 'Preparing', label: 'Preparing', desc: 'Your service/items are readying' },
  { status: 'Picked Up', label: 'Picked Up', desc: 'Driver has retrieved package' },
  { status: 'On The Way', label: 'On The Way', desc: 'Delivery is heading your way' },
  { status: 'Delivered', label: 'Delivered', desc: 'Order arrived successfully' },
];

export const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { order, isLoading: isOrderLoading } = useOrderSingleRealtime(id);
  const { tracking, isLoading: isTrackingLoading } = useOrderTrackingRealtime(id);

  const currentStatus = order?.status || 'Pending';
  const isFinished = currentStatus === 'Delivered' || currentStatus === 'Cancelled' || currentStatus === 'Failed';

  // Get active step index
  const activeStepIndex = STEPS.findIndex((s) => s.status === currentStatus);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
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
        // Standard coordinates: Store: lat: -1.2635, lng: 36.8049 | User: lat: -1.2894, lng: 36.7909
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
        ctx.fillText('Mwangi (Driver)', driverX - 35, driverY - 16);
      }

      animationId = requestAnimationFrame(drawMap);
    };

    drawMap();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [tracking]);

  if (isOrderLoading || isTrackingLoading) {
    return (
      <PageContainer>
        <ContentContainer size="md" className="flex flex-col items-center justify-center min-h-[70vh] animate-pulse">
          <div className="w-full max-w-lg space-y-4">
            <div className="h-64 bg-slate-100 rounded-2xl"></div>
            <div className="h-10 bg-slate-100 rounded w-1/3"></div>
            <div className="h-6 bg-slate-100 rounded w-2/3"></div>
          </div>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer>
        <ContentContainer size="md" className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-slate-500 mb-6">This order requested does not exist or has expired.</p>
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
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Live Delivery Track
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>

        <Badge className={`${currentStatus === 'Delivered' ? 'bg-emerald-500' : 'bg-primary'} text-white font-extrabold px-4 py-1.5 text-sm rounded-full shadow-md border-0`}>
          {currentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map HUD View */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[360px] relative overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md rounded-2xl flex flex-col">
            <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-slate-950/95 shadow-lg border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-850 dark:text-white">
              <Map className="w-4 h-4 text-primary animate-pulse" />
              Nairobi Delivery Coordinates Grid
            </div>

            <canvas ref={canvasRef} className="flex-1 w-full bg-slate-50 dark:bg-slate-950 cursor-crosshair" />

            {/* Custom bottom HUD detail */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[200px]">{order.deliveryLocation.address}</span>
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
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-6">Delivery Progress</h3>
            
            <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6">
              {STEPS.map((step, idx) => {
                const isCompleted = idx <= activeStepIndex && !isFinished;
                const isCurrent = idx === activeStepIndex && !isFinished;
                const isStepFinished = currentStatus === 'Delivered' && idx === STEPS.length - 1;

                return (
                  <div key={idx} className="relative">
                    {/* Circle Indicator */}
                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted || isStepFinished
                        ? 'bg-primary border-primary shadow-md shadow-primary/30 scale-110' 
                        : isCurrent 
                        ? 'bg-amber-400 border-amber-400 animate-ping'
                        : 'bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-700'
                    }`}>
                      {(isCompleted || isStepFinished) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${
                        isCompleted || isCurrent || isStepFinished
                          ? 'text-slate-900 dark:text-white' 
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {step.label}
                      </span>
                      <span className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Info card sidepanel */}
        <div className="space-y-6">
          {/* Driver Contact details */}
          {tracking?.driverName && (
            <Card className="p-5 border border-slate-100 dark:border-slate-800 shadow-md bg-indigo-50/40 dark:bg-indigo-950/10">
              <h3 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-primary" />
                Delivery Attendant
              </h3>
              
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-extrabold text-lg text-primary">
                  {tracking.driverName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{tracking.driverName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attendant on Route</p>
                </div>
              </div>

              <div className="flex gap-2">
                <a 
                  href={`tel:${tracking.driverPhone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Call Attendant
                </a>
                <Button 
                  variant="outline"
                  className="flex-shrink-0 p-2.5"
                  onClick={() => alert('Opening live provider chat...')}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Delivery Details */}
          <Card className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">Request Summary</h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Store Name:</span>
                <span className="font-bold text-slate-950 dark:text-white">{order.storeName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Recipient Phone:</span>
                <span className="font-bold text-slate-950 dark:text-white">+254 712 345678</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Payment Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Price:</span>
                <span className="font-extrabold text-slate-950 dark:text-white">{order.totalAmount.toLocaleString()} KES</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </ContentContainer>
    </PageContainer>
  );
};
