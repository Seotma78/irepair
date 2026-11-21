import React from 'react';
import {
  Star,
  Clock,
  ShieldCheck,
  Smartphone,
  Coins,
  Wrench,
  QrCode,
  Truck,
  CheckCircle2,
  Award,
  BadgePoundSterling,
  Lock,
  Sparkles,
  Zap,
  Laptop,
  Tablet,
  Watch,
  HelpCircle,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Clock,
  ShieldCheck,
  Smartphone,
  Coins,
  Wrench,
  QrCode,
  Truck,
  CheckCircle2,
  Award,
  BadgePoundSterling,
  Lock,
  Sparkles,
  Zap,
  Laptop,
  Tablet,
  Watch,
  HelpCircle,
};

export const HOME2_ICON_OPTIONS = Object.keys(ICON_MAP).map((key) => ({
  label: key,
  value: key,
}));

export function renderHome2Icon(name: string | undefined, className = 'w-5 h-5') {
  const IconComp = (name && ICON_MAP[name]) || Sparkles;
  return <IconComp className={className} />;
}
