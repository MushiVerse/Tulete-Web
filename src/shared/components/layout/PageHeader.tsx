import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standardized PageHeader.
 * Ensures page titles, subtitles, and primary actions are perfectly aligned across the application.
 */
export const PageHeader = ({ title, subtitle, action, className = '' }: PageHeaderProps) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 ${className}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
