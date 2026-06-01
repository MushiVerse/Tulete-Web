import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionWrapperProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionLink?: string;
  children: React.ReactNode;
  delay?: number;
}

export const SectionWrapper = ({
  title,
  subtitle,
  actionText = 'See All',
  actionLink,
  children,
  delay = 0
}: SectionWrapperProps) => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="py-4"
    >
      <div className="flex items-end justify-between mb-4 px-4 md:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {actionLink && (
          <Link 
            to={actionLink}
            className="flex items-center text-xs font-semibold text-primary hover:underline group"
          >
            {actionText}
            <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      {/* 
        Horizontal scrollable container with hidden scrollbar.
        Padding matches the header px-4 to ensure cards start aligned but bleed off screen.
      */}
      <div className="relative w-full">
        <div className="flex overflow-x-auto gap-4 px-4 md:px-6 pb-4 pt-1 snap-x snap-mandatory hide-scrollbar">
          {children}
        </div>
      </div>
    </motion.section>
  );
};
