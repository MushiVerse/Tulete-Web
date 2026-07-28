import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  title = 'Image Preview',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        paginate(-1);
      } else if (e.key === 'ArrowRight') {
        paginate(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || !images || images.length === 0) return null;

  const paginate = (direction: number) => {
    setZoomLevel(1);
    setCurrentIndex((prev) => {
      let next = prev + direction;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      return next;
    });
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(1, prev + delta), 3));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 select-none"
        onClick={onClose}
      >
        {/* Header Bar */}
        <div 
          className="w-full flex items-center justify-between z-20 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 bg-white/10 rounded-full border border-white/20">
              {currentIndex + 1} / {images.length}
            </span>
            <span className="text-sm font-semibold truncate max-w-[200px] md:max-w-md text-white/80">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom(0.5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleZoom(-0.5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-600 transition-colors text-white ml-2 cursor-pointer"
              title="Close Viewer (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Stage */}
        <div 
          className="relative flex-1 flex items-center justify-center overflow-hidden my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.length > 1 && (
            <button
              onClick={() => paginate(-1)}
              className="absolute left-2 md:left-6 z-30 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/10 cursor-pointer"
              title="Previous Image"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          <motion.div
            key={currentIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: zoomLevel, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full flex items-center justify-center p-2"
          >
            <img
              src={images[currentIndex]}
              alt={`${title} - Image ${currentIndex + 1}`}
              className="max-h-[75vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
              onClick={() => handleZoom(zoomLevel > 1 ? -0.5 : 0.5)}
            />
          </motion.div>

          {images.length > 1 && (
            <button
              onClick={() => paginate(1)}
              className="absolute right-2 md:right-6 z-30 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/10 cursor-pointer"
              title="Next Image"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>

        {/* Footer Thumbnails Scroll Bar */}
        {images.length > 1 && (
          <div 
            className="w-full max-w-4xl mx-auto flex items-center gap-3 overflow-x-auto scrollbar-none py-2 px-4 z-20 justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setZoomLevel(1);
                  setCurrentIndex(idx);
                }}
                className={`relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-primary ring-2 ring-primary/60 scale-105 opacity-100'
                    : 'border-white/20 opacity-50 hover:opacity-90'
                }`}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
