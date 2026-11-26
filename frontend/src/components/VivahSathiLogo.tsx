import React from 'react';
import type { Language } from '../types';

interface VivahSathiLogoProps {
  variant?: 'icon' | 'full' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  lang?: Language;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const VivahSathiLogo: React.FC<VivahSathiLogoProps> = ({
  variant = 'full',
  size = 'md',
  lang = 'hi',
  showTagline = true,
  className = '',
  onClick,
}) => {
  // Size mappings for icon
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  // Text size mappings
  const titleSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const brandText = lang === 'hi' ? 'विवाह साथी' : 'VivahSathi';

  const IconEmblem = (
    <div
      className={`relative rounded-full p-0.5 bg-gradient-to-tr from-gold-600 via-gold-300 to-gold-100 shadow-gold-glow flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 ${iconSizes[size]}`}
    >
      <div className="w-full h-full bg-maroon-950 rounded-full overflow-hidden flex items-center justify-center relative p-1 border border-gold-500/40">
        {/* Subtle background shine */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/20 via-maroon-900/60 to-maroon-950 opacity-90" />
        
        {/* SVG Logo Graphic */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rich Imperial Gold Gradient */}
            <linearGradient id="vsGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF7D6" />
              <stop offset="25%" stopColor="#F5C518" />
              <stop offset="65%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#9E7412" />
            </linearGradient>

            {/* Radiant Flame & Heart Accent Gradient */}
            <linearGradient id="vsFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#C72545" />
              <stop offset="50%" stopColor="#FF9933" />
              <stop offset="100%" stopColor="#FFF3B0" />
            </linearGradient>
            
            {/* Soft Glow Filter */}
            <filter id="vsGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Decorative Outer Filigree Dots */}
          <circle cx="50" cy="50" r="46" stroke="url(#vsGoldGrad)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
          <circle cx="50" cy="50" r="43" stroke="url(#vsGoldGrad)" strokeWidth="1.5" />

          {/* Royal Mukut / Crown Arch Top */}
          <path
            d="M 36 28 Q 50 20 64 28 Q 58 22 50 22 Q 42 22 36 28 Z"
            fill="url(#vsGoldGrad)"
          />
          {/* Top Crown Jewels */}
          <circle cx="50" cy="18" r="2.5" fill="url(#vsFlameGrad)" />
          <circle cx="41" cy="22" r="1.8" fill="url(#vsGoldGrad)" />
          <circle cx="59" cy="22" r="1.8" fill="url(#vsGoldGrad)" />

          {/* Central Sacred Kalash / Pot Motif */}
          {/* Base */}
          <path d="M 40 76 L 60 76 L 57 80 L 43 80 Z" fill="url(#vsGoldGrad)" />
          {/* Pot Belly */}
          <path
            d="M 35 74 C 30 65, 34 54, 50 54 C 66 54, 70 65, 65 74 Z"
            fill="url(#vsGoldGrad)"
            stroke="#560619"
            strokeWidth="1"
          />
          {/* Pot Neck Ring */}
          <path d="M 38 54 L 62 54 L 60 51 L 40 51 Z" fill="#FFF7D6" />

          {/* Sacred Flame / Agni / Diya (center top of Kalash) */}
          <path
            d="M 50 51 C 44 44, 46 34, 50 28 C 54 34, 56 44, 50 51 Z"
            fill="url(#vsFlameGrad)"
            filter="url(#vsGlowFilter)"
          />
          <path
            d="M 50 49 C 47 44, 48 37, 50 33 C 52 37, 53 44, 50 49 Z"
            fill="#FFFDF0"
          />

          {/* Mango Leaves (Traditional Wedding Kalash) */}
          {/* Left Leaf */}
          <path d="M 38 51 C 28 45, 26 36, 32 32 C 37 36, 40 44, 42 49 Z" fill="url(#vsGoldGrad)" />
          {/* Right Leaf */}
          <path d="M 62 51 C 72 45, 74 36, 68 32 C 63 36, 60 44, 58 49 Z" fill="url(#vsGoldGrad)" />

          {/* Interlocking Wedding Gathbandhan Knot / Twin Hearts Motif */}
          <path
            d="M 43 64 C 38 59, 36 67, 43 71 C 50 75, 50 75, 50 75 C 50 75, 50 75, 57 71 C 64 67, 62 59, 57 64 C 53 68, 50 71, 50 71 C 50 71, 47 68, 43 64 Z"
            fill="url(#vsFlameGrad)"
            opacity="0.9"
          />
          <path
            d="M 50 67 C 47 64, 44 67, 47 70 C 50 72, 50 72, 50 72 C 50 72, 50 72, 53 70 C 56 67, 53 64, 50 67 Z"
            fill="url(#vsGoldGrad)"
          />

          {/* Sparkling 4-point stars flanking the logo */}
          <path d="M 23 45 Q 23 41 19 41 Q 23 41 23 37 Q 23 41 27 41 Q 23 41 23 45 Z" fill="url(#vsGoldGrad)" />
          <path d="M 77 45 Q 77 41 73 41 Q 77 41 77 37 Q 77 41 81 41 Q 77 41 77 45 Z" fill="url(#vsGoldGrad)" />
        </svg>
      </div>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={`cursor-pointer inline-flex ${className}`} onClick={onClick}>
        {IconEmblem}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center space-x-3 cursor-pointer group select-none ${className}`}
      onClick={onClick}
    >
      {IconEmblem}

      <div className="flex flex-col">
        {/* Brand Name Title */}
        <div className="flex items-center space-x-2">
          <span
            className={`font-royal font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-300 to-gold-400 drop-shadow-sm group-hover:from-white group-hover:to-gold-200 transition-colors duration-300 ${titleSizes[size]}`}
          >
            {brandText}
          </span>
          
          {/* Royal Mandap Badge pill */}
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded-md bg-gradient-to-r from-maroon-800 to-maroon-700 text-gold-300 border border-gold-500/30 uppercase shadow-inner">
            {lang === 'hi' ? 'शादी सेवा' : 'Aggregator'}
          </span>
        </div>

        {/* Subtitle / Trust Pitch */}
        {showTagline && (
          <div className="flex items-center space-x-1.5 text-[11px] text-gold-300/90 font-medium">
            <svg
              className="w-3.5 h-3.5 text-gold-400 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="tracking-tight">
              {lang === 'hi' ? '100% कंपनी जवाबदेही' : '100% Guaranteed Accountability'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
