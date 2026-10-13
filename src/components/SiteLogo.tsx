import React, { useState } from 'react';
import { SiteSettings } from '../types.js';
import cosisLogoPng from '../assets/cosis_logo.png';

interface SiteLogoProps {
  settings?: Partial<SiteSettings>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SiteLogo: React.FC<SiteLogoProps> = ({
  settings,
  size = 'md',
  className = '',
}) => {
  // Dimension classes
  const sizeMap = {
    sm: 'w-7 h-7 p-0.5',
    md: 'w-10 h-10 p-1',
    lg: 'w-14 h-14 p-1.5',
    xl: 'w-20 h-20 p-2',
  };

  const initialUrl = settings?.site_logo_data || 'https://www.cosis.edu.pk/images/logo.png';
  const [imgSrc, setImgSrc] = useState<string>(initialUrl);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      // Fallback to local bundled copy if external domain has CORS/network restrictions
      setImgSrc(cosisLogoPng);
    }
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-white border border-emerald-600/30 shadow-xs shrink-0 overflow-hidden flex items-center justify-center transition-all ${className}`}
    >
      <img
        src={imgSrc}
        alt="COSIS Hostels Attendance Management System Logo"
        className="w-full h-full object-contain"
        onError={handleImageError}
        crossOrigin="anonymous"
      />
    </div>
  );
};
