'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/types';

export interface InsightsRevealTopTag {
  tag: string;
  label?: string;
  level: number;
}

export interface InsightsRevealArchetype {
  name: string;
  emoji: string;
  summary: string;
}

export interface InsightsRevealRoleBalance {
  give: number;
  receive: number;
}

export interface InsightsRevealProps {
  topTags: InsightsRevealTopTag[];
  archetype?: InsightsRevealArchetype;
  roleBalance?: InsightsRevealRoleBalance;
  onContinue: () => void;
  locale: Locale;
  loading?: boolean;
}

const COPY = {
  title: {
    ru: 'Вот что мы узнали про тебя',
    en: 'Here is what we learned about you',
  },
  topInterests: {
    ru: 'Твои главные интересы',
    en: 'Your top interests',
  },
  archetypeHeading: {
    ru: 'Твой архетип',
    en: 'Your archetype',
  },
  roleHeading: {
    ru: 'Давать vs получать',
    en: 'Give vs receive',
  },
  giveLabel: { ru: 'Давать', en: 'Give' },
  receiveLabel: { ru: 'Получать', en: 'Receive' },
  continue: { ru: 'Продолжить', en: 'Continue' },
  nothingYet: {
    ru: 'Мы ещё собираем данные — продолжай свайпать.',
    en: 'Still gathering data — keep swiping.',
  },
} as const;

function humanize(tag: string): string {
  return tag
    .split(/[_-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

export function InsightsReveal({
  topTags,
  archetype,
  roleBalance,
  onContinue,
  locale,
  loading = false,
}: InsightsRevealProps) {
  const top = topTags.slice(0, 3);
  const hasAnyData = top.length > 0 || archetype !== undefined || (roleBalance && (roleBalance.give + roleBalance.receive) > 0);

  return (
    <div className="min-h-screen -m-4 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-6 py-10 space-y-8"
      >
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 16 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/30"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {COPY.title[locale]}
          </h1>
        </div>

        {!hasAnyData && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-white/70"
          >
            {COPY.nothingYet[locale]}
          </motion.p>
        )}

        {archetype && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-2"
          >
            <div className="text-xs uppercase tracking-widest text-pink-300/80">
              {COPY.archetypeHeading[locale]}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl" aria-hidden>{archetype.emoji}</div>
              <div className="text-xl font-semibold text-white">{archetype.name}</div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{archetype.summary}</p>
          </motion.section>
        )}

        {top.length > 0 && (
          <section className="space-y-4">
            <div className="text-xs uppercase tracking-widest text-pink-300/80">
              {COPY.topInterests[locale]}
            </div>
            <ul className="space-y-3">
              {top.map((t, i) => {
                const label = t.label ?? humanize(t.tag);
                const pct = Math.max(0, Math.min(100, t.level));
                return (
                  <li key={t.tag} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/90">{label}</span>
                      <span className="text-white/60 tabular-nums">{pct}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.35 + i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {roleBalance && (roleBalance.give + roleBalance.receive) > 0 && (
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-pink-300/80">
              {COPY.roleHeading[locale]}
            </div>
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>{COPY.giveLabel[locale]} · {roleBalance.give}%</span>
              <span>{roleBalance.receive}% · {COPY.receiveLabel[locale]}</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden bg-white/10 flex">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400"
                initial={{ width: 0 }}
                animate={{ width: `${roleBalance.give}%` }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${roleBalance.receive}%` }}
                transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
              />
            </div>
          </section>
        )}

        <Button
          onClick={onContinue}
          disabled={loading}
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white border-0"
        >
          {COPY.continue[locale]}
        </Button>
      </motion.div>
    </div>
  );
}

export default InsightsReveal;
