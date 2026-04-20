'use client';

import { motion } from 'framer-motion';
import type { Locale } from '@/lib/types';

interface DiscoveryProgressProps {
  current: number;
  total?: number;
  locale: Locale;
  compact?: boolean;
}

export function DiscoveryProgress({
  current,
  total,
  locale,
  compact = false,
}: DiscoveryProgressProps) {
  const hasKnownTotal = typeof total === 'number' && total > 0;
  const percent = hasKnownTotal ? Math.min(100, (current / total) * 100) : null;

  const label = hasKnownTotal
    ? `${current} / ${total}`
    : locale === 'ru'
      ? `Отвечено: ${current}`
      : `Answered: ${current}`;

  return (
    <div className={compact ? 'w-full' : 'w-full px-4 pt-3 pb-2'}>
      <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
        <span>{locale === 'ru' ? 'Прогресс' : 'Progress'}</span>
        <span className="font-mono tabular-nums">{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        {percent !== null ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
          />
        ) : (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-gradient-to-r from-pink-500/60 to-purple-500/60"
          />
        )}
      </div>
    </div>
  );
}
