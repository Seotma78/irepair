import React from 'react';
import { motion } from 'framer-motion';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderProps {
  /** The main page title rendered inside the only <h1> tag */
  title: string;
  /** Optional secondary subtitle or context text */
  subtitle?: string;
  /** Optional badge pill above the title (e.g. 'ABOUT IPLAYER MOBILES') */
  badge?: string;
  /** Optional breadcrumbs list */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional custom background image path or URL */
  backgroundImage?: string;
  /** Optional extra class names for container customization */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  breadcrumbs,
  backgroundImage = '/assets/aistudio/image_062af09e.png',
  className = '',
}) => {
  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-950 border-b-4 border-[#DF0C88] shadow-lg ${className}`}
    >
      {/* Background with fixed position on scroll (parallax effect) */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Transparent 50% dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Subtle bottom neon glow accent behind the border */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DF0C88] to-transparent opacity-90 blur-[2px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16 text-center">
        
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <motion.nav
            aria-label="Breadcrumb"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-3"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-600 select-none">/</span>}
                  {isLast ? (
                    <span className="text-pink-400 font-semibold">{crumb.label}</span>
                  ) : crumb.onClick ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : crumb.href ? (
                    <a href={crumb.href} className="hover:text-white transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </motion.nav>
        )}

        {/* Optional Badge */}
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-[#DF0C88] text-[11px] font-bold uppercase tracking-wider mb-3 shadow-xs"
          >
            <span>{badge}</span>
          </motion.div>
        )}

        {/* The single <h1> SEO title for the inner page */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight drop-shadow-md"
        >
          {title}
        </motion.h1>

        {/* Optional Subtitle */}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            className="mt-3 text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
};
