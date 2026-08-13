import React from 'react';

interface AdminLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  isDark?: boolean;
}

export const AdminLogo: React.FC<AdminLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  isDark = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-xs' },
    md: { box: 'w-10 h-10', text: 'text-sm' },
    lg: { box: 'w-16 h-16', text: 'text-xl' },
    xl: { box: 'w-24 h-24', text: 'text-3xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const eyeColor = isDark ? '#ffffff' : '#0f172a';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${currentSize.box} shrink-0 flex items-center justify-center`}>
        <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Left Eye */}
          <circle cx="34" cy="28" r="14" stroke={eyeColor} strokeWidth="4" fill="none" />
          <circle cx="34" cy="28" r="8" fill={eyeColor} />

          {/* Right Eye */}
          <circle cx="66" cy="28" r="14" stroke={eyeColor} strokeWidth="4" fill="none" />
          <path d="M 57 20 A 10 10 0 0 1 73 18" stroke="#e89a3c" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Smile */}
          <path d="M 38 48 Q 50 58 62 48" stroke="#e89a3c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {showText && (
        <span className={`font-black tracking-tight ${currentSize.text} text-[#e89a3c]`}>
          T-Admin
        </span>
      )}
    </div>
  );
};
