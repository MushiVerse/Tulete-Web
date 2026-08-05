import React from 'react';
import { motion, Transition } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  isPublic?: boolean;
}

/**
 * Standardized PageContainer that replaces PageWrapper.
 * Enforces the base flex layout, minimum height, background color, and route transitions.
 */
export const PageContainer = ({ children, className = '', isPublic = false }: PageContainerProps) => {
  return (
    <div
      className={`w-full flex flex-col min-h-screen bg-background ${isPublic ? '' : 'pb-24 md:pb-0'} ${className}`}
    >
      {children}
    </div>
  );
};
