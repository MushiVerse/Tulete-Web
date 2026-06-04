import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Standardized Section.
 * Enforces vertical rhythm (spacing) between distinct blocks of content on a page.
 */
export const Section = ({ children, title, description, className = '' }: SectionProps) => {
  return (
    <section className={`flex flex-col gap-4 mb-8 md:mb-10 last:mb-0 ${className}`}>
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </section>
  );
};
