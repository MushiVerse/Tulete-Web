import React from 'react';
import { motion, Transition } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const PageWrapper = ({ children, className = '' }: PageWrapperProps) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`w-full h-full flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
};
