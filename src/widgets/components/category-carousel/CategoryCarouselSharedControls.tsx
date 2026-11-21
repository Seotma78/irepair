import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  DeviceMode,
  ResponsiveValue,
  resolveResponsive,
  checkContrast,
} from './categoryCarouselTypes';

/* ==========================================================================
   1. DEVICE SWITCHER
   ========================================================================== */
interface DeviceSwitcherProps {
  activeDevice: DeviceMode;
  onChange: (device: DeviceMode) => void;
  className?: string;
  showPreviewLabels?: boolean;
}

export const DeviceSwitcher: React.FC<DeviceSwitcherProps> = ({
  activeDevice,
  onChange,
  className = '',
  showPreviewLabels = true,
}) => {
  const devices: { mode: DeviceMode; label: string; icon: React.ReactNode; widthHint: string }[] = [
    { mode: 'desktop', label: 'Desktop', icon: <Monitor className="w-3.5 h-3.5" />, widthHint: '≥ 1024px' },
    { mode: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" />, widthHint: '768 - 1023px' },
    { mode: 'mobile', label: 'Mobile', icon: <Smartphone className="w-3.5 h-3.5" />, widthHint: '< 768px' },
  ];

  return (
    <div className={`inline-flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-sm ${className}`}>
      {devices.map(({ mode, label, icon, widthHint }) => {
        const isActive = activeDevice === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title={`${label} (${widthHint})`}
          >
            {icon}
            <span>{label}</span>
            {showPreviewLabels && (
              <span className={`text-[10px] hidden sm:inline ml-0.5 opacity-70`}>
                {mode === 'desktop' ? '100%' : mode === 'tablet' ? '768px' : '375px'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ==========================================================================
   2. RESPONSIVE FIELD WRAPPER
   ========================================================================== */
interface ResponsiveFieldWrapperProps {
  label: string;
  activeDevice: DeviceMode;
  description?: string;
  hasOverride: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}

export const ResponsiveFieldWrapper: React.FC<ResponsiveFieldWrapperProps> = ({
  label,
  activeDevice,
  description,
  hasOverride,
  onReset,
  children,
}) => {
  const getDeviceIcon = () => {
    switch (activeDevice) {
      case 'mobile':
        return <Smartphone className="w-3 h-3 text-pink-400" />;
      case 'tablet':
        return <Tablet className="w-3 h-3 text-sky-400" />;
      default:
        return <Monitor className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-medium text-slate-200 flex items-center gap-1.5">
          {getDeviceIcon()}
          <span>{label}</span>
          <span className="text-[10px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {activeDevice}
          </span>
          {activeDevice !== 'desktop' && hasOverride && (
            <span className="text-[9px] text-pink-400 font-semibold bg-pink-500/10 px-1 py-0.2 rounded border border-pink-500/30">
              Customized
            </span>
          )}
          {activeDevice !== 'desktop' && !hasOverride && (
            <span className="text-[9px] text-slate-400 italic">
              (Inheriting from {activeDevice === 'mobile' ? 'Tablet / Desktop' : 'Desktop'})
            </span>
          )}
        </label>

        {activeDevice !== 'desktop' && hasOverride && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-pink-400 hover:underline transition-colors"
            title="Reset to inherited value"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Inherit</span>
          </button>
        )}
      </div>

      {description && <p className="text-[11px] text-slate-400">{description}</p>}
      <div>{children}</div>
    </div>
  );
};

/* ==========================================================================
   3. RESPONSIVE NUMBER / SLIDER INPUT
   ========================================================================== */
interface ResponsiveNumberInputProps {
  label: string;
  value: ResponsiveValue<number>;
  activeDevice: DeviceMode;
  onChange: (updated: ResponsiveValue<number>) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  allowDecimals?: boolean;
}

export const ResponsiveNumberInput: React.FC<ResponsiveNumberInputProps> = ({
  label,
  value,
  activeDevice,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  description,
  allowDecimals = false,
}) => {
  const resolved = resolveResponsive(value, activeDevice);
  const isOverridden = activeDevice !== 'desktop' && value[activeDevice] !== undefined;

  const handleValueChange = (newVal: number) => {
    if (activeDevice === 'desktop') {
      onChange({ ...value, desktop: newVal });
    } else {
      onChange({ ...value, [activeDevice]: newVal });
    }
  };

  const handleReset = () => {
    const updated = { ...value };
    delete updated[activeDevice];
    onChange(updated);
  };

  return (
    <ResponsiveFieldWrapper
      label={label}
      activeDevice={activeDevice}
      description={description}
      hasOverride={isOverridden}
      onReset={handleReset}
    >
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={resolved}
          onChange={(e) => handleValueChange(parseFloat(e.target.value))}
          className="flex-1 accent-pink-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
        />
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs min-w-[70px] justify-between">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={resolved}
            onChange={(e) => {
              const val = allowDecimals ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
              if (!isNaN(val)) handleValueChange(val);
            }}
            className="w-12 bg-transparent text-slate-100 font-mono text-xs focus:outline-none"
          />
          {unit && <span className="text-[11px] text-slate-400 select-none">{unit}</span>}
        </div>
      </div>
    </ResponsiveFieldWrapper>
  );
};

/* ==========================================================================
   4. RESPONSIVE SELECT INPUT
   ========================================================================== */
interface ResponsiveSelectProps<T extends string | boolean> {
  label: string;
  value: ResponsiveValue<T>;
  activeDevice: DeviceMode;
  onChange: (updated: ResponsiveValue<T>) => void;
  options: { label: string; value: T }[];
  description?: string;
}

export const ResponsiveSelect = <T extends string | boolean>({
  label,
  value,
  activeDevice,
  onChange,
  options,
  description,
}: ResponsiveSelectProps<T>) => {
  const resolved = resolveResponsive(value, activeDevice);
  const isOverridden = activeDevice !== 'desktop' && value[activeDevice] !== undefined;

  const handleValueChange = (newVal: T) => {
    if (activeDevice === 'desktop') {
      onChange({ ...value, desktop: newVal });
    } else {
      onChange({ ...value, [activeDevice]: newVal });
    }
  };

  const handleReset = () => {
    const updated = { ...value };
    delete updated[activeDevice];
    onChange(updated);
  };

  return (
    <ResponsiveFieldWrapper
      label={label}
      activeDevice={activeDevice}
      description={description}
      hasOverride={isOverridden}
      onReset={handleReset}
    >
      <select
        value={String(resolved)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((opt) => String(opt.value) === raw);
          if (match) handleValueChange(match.value);
        }}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </ResponsiveFieldWrapper>
  );
};

/* ==========================================================================
   5. ACCORDION GROUP
   ========================================================================== */
interface AccordionGroupProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const AccordionGroup: React.FC<AccordionGroupProps> = ({
  title,
  icon,
  description,
  badge,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-900/60 mb-3 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-pink-400 p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-100">{title}</span>
              {badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {badge}
                </span>
              )}
            </div>
            {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="text-slate-400 p-1">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-700/60 bg-slate-900/40">
          {children}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   6. COLOR INPUT WITH PALETTES
   ========================================================================== */
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  presetPalette?: string[];
  description?: string;
}

const DEFAULT_COLOR_PALETTE = [
  '#E9ECEF',
  '#ffffff',
  '#f8fafc',
  '#0f172a',
  '#1e293b',
  '#DF0C88',
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  'transparent',
];

export const ColorInput: React.FC<ColorInputProps> = ({
  label,
  value,
  onChange,
  presetPalette = DEFAULT_COLOR_PALETTE,
  description,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-medium text-slate-200">{label}</label>
        <span className="text-[11px] font-mono text-slate-400">{value}</span>
      </div>
      {description && <p className="text-[11px] text-slate-400">{description}</p>}

      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#E9ECEF'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff or rgba(...)"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-pink-500"
        />
      </div>

      <div className="flex flex-wrap gap-1 pt-1">
        {presetPalette.map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => onChange(col)}
            className={`w-5 h-5 rounded border transition-all ${
              value === col ? 'ring-2 ring-pink-500 scale-110' : 'border-slate-700 hover:scale-105'
            }`}
            style={{ backgroundColor: col === 'transparent' ? '#ffffff' : col }}
            title={col}
          >
            {col === 'transparent' && <span className="text-[8px] text-slate-400">∅</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   7. CONTRAST BADGE
   ========================================================================== */
interface ContrastBadgeProps {
  textColor: string;
  bgColor: string;
}

export const ContrastBadge: React.FC<ContrastBadgeProps> = ({ textColor, bgColor }) => {
  const contrast = checkContrast(textColor, bgColor);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
        contrast.passesAA
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      }`}
    >
      {contrast.passesAA ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      )}
      <span>Contrast: {contrast.ratio}:1</span>
      <span className="font-bold text-[10px] ml-1">
        {contrast.passesAAA ? '(AAA Pass)' : contrast.passesAA ? '(AA Pass)' : '(Low Contrast)'}
      </span>
    </div>
  );
};
