import React, { useRef, useEffect } from 'react';
import { GeoLocation } from '../services/locationService';
import { Card } from '../../../shared/components/ui/Card';
import { MapPin, Navigation, Compass, Loader2 } from 'lucide-react';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'user' | 'store' | 'driver' | 'destination';
}

interface InteractiveMapProps {
  center: GeoLocation;
  markers?: MapMarker[];
  routePath?: GeoLocation[];
  onMapClick?: (coords: GeoLocation) => void;
  isLoading?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  markers = [],
  routePath = [],
  onMapClick,
  isLoading = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let pulseScale = 0;

    // Rescale helper for high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Geographical coordinates bounds centered around Dodoma, Tanzania
    // lat bounds: approx -6.20 to -6.10
    // lng bounds: approx 35.70 to 35.80
    const latCenter = center.lat;
    const lngCenter = center.lng;
    const zoomScale = 12000; // pixels per degree

    // Map helper projection: Coordinates -> Canvas coordinates
    const project = (lat: number, lng: number) => {
      const x = width / 2 + (lng - lngCenter) * zoomScale;
      // Invert Y axis for canvas drawing
      const y = height / 2 - (lat - latCenter) * zoomScale;
      return { x, y };
    };

    // Draw grid map loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw beautiful dark grid representing maps coordinates
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Note: Street layouts dynamically rendered for active location.

      // 3. Draw active vector route directions path if present
      if (routePath.length > 0) {
        ctx.beginPath();
        routePath.forEach((pt, idx) => {
          const canvasPt = project(pt.lat, pt.lng);
          if (idx === 0) ctx.moveTo(canvasPt.x, canvasPt.y);
          else ctx.lineTo(canvasPt.x, canvasPt.y);
        });
        
        ctx.strokeStyle = '#6366f1'; // Premium primary indigo route path
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Pulsing navigation direction dashes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw markers
      pulseScale += 0.05;
      const pulsingRadius = 8 + Math.sin(pulseScale) * 4;

      markers.forEach((m) => {
        const { x, y } = project(m.lat, m.lng);

        // Clip out markers outside bounds
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) return;

        if (m.type === 'user') {
          // Pulse halo
          ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.beginPath();
          ctx.arc(x, y, pulsingRadius + 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#6366f1';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (m.type === 'driver') {
          // Driver icon (blue halo with navigation arrow)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.beginPath();
          ctx.arc(x, y, pulsingRadius + 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#10b981'; // pulsing emerald green delivery driver!
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (m.type === 'store') {
          // Store pin
          ctx.fillStyle = '#f59e0b'; // store amber
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Title text label
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(m.label, x, y - 8);
        } else if (m.type === 'destination') {
          // Destination pin
          ctx.fillStyle = '#ef4444'; // destination rose red
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // Request next frame
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [center, markers, routePath]);

  // Click on map canvas translates canvas pixels -> GPS coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMapClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixels to lat/lng based on project math inverted
    const latCenter = center.lat;
    const lngCenter = center.lng;
    const zoomScale = 12000;

    const lng = lngCenter + (x - rect.width / 2) / zoomScale;
    const lat = latCenter - (y - rect.height / 2) / zoomScale;

    onMapClick({ lat, lng });
  };

  return (
    <Card className="relative w-full h-[280px] bg-slate-50 border border-border overflow-hidden shadow-sm flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Actual interactive vector canvas element */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair block"
        style={{ touchAction: 'none' }}
      />

      {/* Floating control gauges */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button 
          className="p-2 bg-card border border-border rounded-full shadow-md text-muted-foreground hover:text-primary transition-all focus:outline-none"
          title="Compass center"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-850 px-3 py-1.5 rounded-lg shadow-sm text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        Location Grid HUD
      </div>
    </Card>
  );
};
