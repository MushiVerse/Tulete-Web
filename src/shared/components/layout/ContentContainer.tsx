import React from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ContentContainerProps {
  children: React.ReactNode;
  size?: ContainerSize;
  className?: string;
  noPadding?: boolean;
}

const SIZE_MAP: Record<ContainerSize, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'w-full',
};

/**
 * Standardized ContentContainer.
 * Handles responsive edge padding and standard maximum widths to ensure visual harmony across pages.
 */
export const ContentContainer = ({ 
  children, 
  size = 'md', 
  className = '',
  noPadding = false 
}: ContentContainerProps) => {
  const maxWidthClass = SIZE_MAP[size];
  const paddingClass = noPadding ? '' : 'px-4 md:px-6 lg:px-8 py-6 md:py-8';

  return (
    <div className={`w-full mx-auto ${maxWidthClass} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};
