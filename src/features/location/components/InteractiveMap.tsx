import React, { useRef, useEffect, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { GeoLocation } from '../services/locationService';
import { Card } from '../../../shared/components/ui/Card';
import { MapPin, Navigation, Compass, Loader2, Layers } from 'lucide-react';
import { useThemeStore } from '../../../core/theme/useThemeStore';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  subtitle?: string;
  type: 'user' | 'store' | 'driver' | 'destination';
}

interface InteractiveMapProps {
  center: GeoLocation;
  markers?: MapMarker[];
  routePath?: GeoLocation[];
  onMapClick?: (coords: GeoLocation) => void;
  onMarkerClick?: (markerId: string) => void;
  isLoading?: boolean;
}

const containerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '0.75rem',
};

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const lightMapStyles = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  markers = [],
  routePath = [],
  onMapClick,
  onMarkerClick,
  isLoading = false,
}) => {
  const { isDark } = useThemeStore();
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isGoogleAvailable = typeof window !== 'undefined' && !!window.google?.maps;

  useEffect(() => {
    if (isGoogleAvailable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let pulseScale = 0;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const latCenter = center.lat;
    const lngCenter = center.lng;
    const zoomScale = 12000;

    const project = (lat: number, lng: number) => {
      const x = width / 2 + (lng - lngCenter) * zoomScale;
      const y = height / 2 - (lat - latCenter) * zoomScale;
      return { x, y };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

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

      if (routePath.length > 0) {
        ctx.beginPath();
        routePath.forEach((pt, idx) => {
          const canvasPt = project(pt.lat, pt.lng);
          if (idx === 0) ctx.moveTo(canvasPt.x, canvasPt.y);
          else ctx.lineTo(canvasPt.x, canvasPt.y);
        });

        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      pulseScale += 0.05;

      markers.forEach((m) => {
        const { x, y } = project(m.lat, m.lng);
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) return;

        const isHovered = hoveredMarker?.id === m.id;
        const radius = isHovered ? 9 : 7;

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fillStyle = m.type === 'destination' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(99, 102, 241, 0.25)';
          ctx.fill();
        }

        ctx.fillStyle = m.type === 'destination' ? '#ef4444' : m.type === 'driver' ? '#10b981' : '#6366f1';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#0f172a' : '#1e293b';
        ctx.font = isHovered ? 'bold 10px Inter, sans-serif' : 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        const labelText = isHovered && m.subtitle ? `${m.label} (${m.subtitle})` : m.label;
        ctx.fillText(labelText, x, y - (isHovered ? 12 : 10));
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [center, markers, routePath, hoveredMarker, isGoogleAvailable]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const latCenter = center.lat;
    const lngCenter = center.lng;
    const zoomScale = 12000;

    if (markers.length > 0) {
      const hitMarker = markers.find((m) => {
        const mx = rect.width / 2 + (m.lng - lngCenter) * zoomScale;
        const my = rect.height / 2 - (m.lat - latCenter) * zoomScale;
        return Math.hypot(x - mx, y - my) <= 20;
      });

      if (hitMarker) {
        setHoveredMarker(hitMarker);
        return;
      }
    }

    setHoveredMarker(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const latCenter = center.lat;
    const lngCenter = center.lng;
    const zoomScale = 12000;

    // Check if clicked hit any marker
    if (onMarkerClick && markers.length > 0) {
      const hitMarker = markers.find((m) => {
        const mx = rect.width / 2 + (m.lng - lngCenter) * zoomScale;
        const my = rect.height / 2 - (m.lat - latCenter) * zoomScale;
        return Math.hypot(x - mx, y - my) <= 20;
      });

      if (hitMarker) {
        onMarkerClick(hitMarker.id);
        return;
      }
    }

    if (onMapClick) {
      const lng = lngCenter + (x - rect.width / 2) / zoomScale;
      const lat = latCenter - (y - rect.height / 2) / zoomScale;
      onMapClick({ lat, lng });
    }
  };

  return (
    <Card className="relative w-full h-[320px] bg-slate-50 border border-border overflow-hidden shadow-sm flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {isGoogleAvailable ? (
        <div className="relative w-full h-full">
          <button
            type="button"
            onClick={() => setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
            className={`absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-md backdrop-blur-md border border-border transition-all cursor-pointer ${
              mapTypeId === 'hybrid'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background/95 text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{mapTypeId === 'hybrid' ? 'Map View' : 'Satellite View'}</span>
          </button>

          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={14}
            mapTypeId={mapTypeId}
            onClick={(e) => {
              if (e.latLng && onMapClick) {
                onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            }}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: 'greedy',
              styles: mapTypeId === 'hybrid' ? [] : (isDark ? darkMapStyles : lightMapStyles),
            }}
          >
            {markers.map((m) => (
              <MarkerF
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.subtitle ? `${m.label} — ${m.subtitle}` : m.label}
                onClick={() => onMarkerClick?.(m.id)}
              />
            ))}

            {routePath.length > 0 && (
              <PolylineF
                path={routePath}
                options={{ strokeColor: '#6366f1', strokeWeight: 5 }}
              />
            )}
          </GoogleMap>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredMarker(null)}
          className="w-full h-full cursor-pointer block"
          style={{ touchAction: 'none' }}
        />
      )}

      <div className="absolute top-3 left-3 bg-background/95 border border-border px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-extrabold uppercase tracking-widest text-foreground flex items-center gap-1.5 pointer-events-none z-10">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        Interactive Location Map
      </div>
    </Card>
  );
};

