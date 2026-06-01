import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  altPrefix?: string;
}

export const ImageGallery = ({ images, altPrefix = 'Gallery image' }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

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
    setCurrentIndex(nextIndex);
  };

  if (!images || images.length === 0) {
    return <div className="w-full aspect-square bg-muted flex items-center justify-center">No image available</div>;
  }

  return (
    <div className="relative w-full flex flex-col gap-4">
      {/* Main Image Slider */}
      <div className="relative w-full aspect-square overflow-hidden bg-muted md:rounded-2xl">
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
            className="absolute inset-0 w-full h-full object-cover"
            alt={`${altPrefix} ${currentIndex + 1}`}
          />
        </AnimatePresence>

        {/* Controls */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-foreground shadow-sm hover:bg-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                paginate(-1);
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-foreground shadow-sm hover:bg-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                paginate(1);
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 md:px-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === idx ? 'border-primary shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
