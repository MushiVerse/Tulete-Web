import React, { useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';

export interface OptimizedImageProps extends Omit<HTMLMotionProps<"img">, 'ref' | 'src'> {
  src?: string;
  fallbackIconSize?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIconSize = 24,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton / Placeholder */}
      {!isLoaded && !hasError && (
        <motion.div
          className="absolute inset-0 bg-slate-200 dark:bg-slate-800"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <ImageIcon size={fallbackIconSize} className="text-slate-400" />
        </div>
      )}

      {/* Actual Image */}
      {src && !hasError && (
        <motion.img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          {...props}
        />
      )}
    </div>
  );
};
