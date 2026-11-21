import React, { useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
  accentColor?: 'pink' | 'emerald';
}

/**
 * Lightweight mouse-tracking spotlight wrapper.
 * Updates --mouse-x and --mouse-y CSS custom properties directly on the DOM node
 * via ref (zero React re-renders during pointer movement).
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  variant = 'light',
  accentColor = 'pink',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const glowRgba =
    variant === 'dark'
      ? accentColor === 'emerald'
        ? 'rgba(16, 185, 129, 0.16)'
        : 'rgba(230, 0, 126, 0.2)'
      : accentColor === 'emerald'
        ? 'rgba(16, 185, 129, 0.09)'
        : 'rgba(230, 0, 126, 0.08)';

  const borderGlowRgba =
    variant === 'dark'
      ? accentColor === 'emerald'
        ? 'rgba(16, 185, 129, 0.55)'
        : 'rgba(230, 0, 126, 0.6)'
      : accentColor === 'emerald'
        ? 'rgba(16, 185, 129, 0.35)'
        : 'rgba(230, 0, 126, 0.35)';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`group/spotlight relative overflow-hidden ${className}`}
      style={
        {
          '--mouse-x': '-999px',
          '--mouse-y': '-999px',
        } as React.CSSProperties
      }
    >
      {/* Surface Radial Specular Sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x) var(--mouse-y), ${glowRgba}, transparent 70%)`,
        }}
      />

      {/* Cursor-Following Border Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-20"
        style={{
          padding: '1px',
          background: `radial-gradient(220px circle at var(--mouse-x) var(--mouse-y), ${borderGlowRgba}, transparent 68%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export default SpotlightCard;
