'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Lightbulb, Eye, AlertTriangle } from 'lucide-react';
import { t, type Locale } from '@/lib/locale';
import type { MatchCategory } from '@/lib/matching';

interface MatchPillProps {
  tag: string;
  category: MatchCategory;
  myInterest: number;
  partnerInterest: number;
  locale: Locale;
}

/**
 * Convert a raw tag_ref ("impact-pain") into a human Title Case label ("Impact Pain").
 */
function formatTag(tag: string): string {
  return tag
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const CATEGORY_STYLES: Record<
  MatchCategory,
  { className: string; Icon: typeof Sparkles }
> = {
  mutual_open: {
    className:
      'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200/70',
    Icon: Sparkles,
  },
  mutual_hidden: {
    className:
      'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/70',
    Icon: Star,
  },
  partner_wants: {
    className:
      'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200/70',
    Icon: Lightbulb,
  },
  you_want: {
    className:
      'bg-muted text-muted-foreground border-transparent hover:bg-muted/70 opacity-80',
    Icon: Eye,
  },
  role_conflict: {
    className:
      'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200/70',
    Icon: AlertTriangle,
  },
};

export function MatchPill({
  tag,
  category,
  myInterest,
  partnerInterest,
  locale,
}: MatchPillProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { className, Icon } = CATEGORY_STYLES[category];
  const label = formatTag(tag);

  const youLabel = t('matchesYouLabel', locale);
  const partnerLabel = t('matchesPartnerLabel', locale);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
    >
      <Badge
        variant="outline"
        className={`${className} gap-1.5 px-3 py-1 text-sm cursor-default transition-colors`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </Badge>
      {showTooltip && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md z-10"
        >
          {youLabel}: {myInterest}% • {partnerLabel}: {partnerInterest}%
        </span>
      )}
    </span>
  );
}
