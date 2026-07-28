import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';

interface ImageGalleryProps {
  images: string[];
  altPrefix?: string;
  selectedIndex?: number;
  onSelectImage?: (index: number, imageUrl: string) => void;
}

export const ImageGallery = ({ 
  images, 
  altPrefix = 'Gallery image',
  selectedIndex,
  onSelectImage
}: ImageGalleryProps) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const currentIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = images.length - 1;
    if (nextIndex >= images.length) nextIndex = 0;
    
    setInternalIndex(nextIndex);
    if (onSelectImage) {
      onSelectImage(nextIndex, images[nextIndex]);
    }
  };

  const handleSelect = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setInternalIndex(idx);
    if (onSelectImage) {
      onSelectImage(idx, images[idx]);
    }
  };

  if (!images || images.length === 0) {
    return <div className="w-full aspect-square bg-muted flex items-center justify-center rounded-2xl text-muted-foreground font-semibold">No image available</div>;
  }

  return (
    <div className="relative w-full flex flex-col gap-4">
      {/* Main Image Slider */}
      <div 
        onClick={() => setIsViewerOpen(true)}
        className="relative w-full aspect-square overflow-hidden bg-muted md:rounded-2xl shadow-sm border border-border/50 group cursor-pointer"
      >
        
        {/* Image Counter Overlay Badge (e.g. 3/4, 1/19) */}
        {images.length > 0 && (
          <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold tracking-wide shadow-md border border-white/20 select-none">
            {currentIndex + 1}/{images.length}
          </div>
        )}

        {/* Fullscreen Expand Icon Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsViewerOpen(true);
          }}
          className="absolute bottom-3 right-3 z-10 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white shadow-md hover:bg-black/80 hover:scale-110 active:scale-95 transition-all opacity-80 group-hover:opacity-100 border border-white/20 cursor-pointer"
          title="Open Fullscreen Viewer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0 w-full h-full object-cover select-none"
            alt={`${altPrefix} ${currentIndex + 1}`}
          />
        </AnimatePresence>

        {/* Controls (Next & Previous Chevron Buttons) */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground shadow-md hover:scale-110 active:scale-95 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                paginate(-1);
              }}
              title="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground shadow-md hover:scale-110 active:scale-95 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                paginate(1);
              }}
              title="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Selectable Thumbnails Carousel */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none hide-scrollbar px-1 py-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all shadow-sm cursor-pointer ${
                currentIndex === idx 
                  ? 'border-primary ring-2 ring-primary/40 scale-105 opacity-100' 
                  : 'border-transparent opacity-60 hover:opacity-100 hover:border-border'
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        isOpen={isViewerOpen}
        images={images}
        initialIndex={currentIndex}
        onClose={() => setIsViewerOpen(false)}
        title={altPrefix}
      />
    </div>
  );
};
