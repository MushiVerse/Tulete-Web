import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HorizontalCarouselProps {
  title: string;
  icon?: React.ReactNode;
  actionText?: string;
  actionLink?: string;
  children: React.ReactNode;
  autoScrollSpeed?: number;
}

export const HorizontalCarousel = ({
  title,
  icon,
  actionText = 'View all',
  actionLink,
  children,
  autoScrollSpeed = 0,
}: HorizontalCarouselProps) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScrollSpeed <= 0) return;
    
    let reqId: number;
    let accumulator = 0;

    const scroll = () => {
      if (!scrollRef.current) return;
      
      // Pause scrolling if user is hovering over the carousel
      if (!scrollRef.current.matches(':hover')) {
        accumulator += autoScrollSpeed;
        if (accumulator >= 1) {
          const pixels = Math.floor(accumulator);
          accumulator -= pixels;
          
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          const maxScroll = scrollWidth - clientWidth;

          if (scrollLeft >= maxScroll - 1) {
            scrollRef.current.scrollLeft = 0;
          } else {
            scrollRef.current.scrollLeft += pixels;
          }
        }
      }
      reqId = requestAnimationFrame(scroll);
    };

    reqId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(reqId);
  }, [autoScrollSpeed]);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
        </div>
        {actionLink && (
          <button
            onClick={() => navigate(actionLink)}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
          >
            {actionText} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-4"
      >
        {children}
      </div>
    </div>
  );
};
