'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/types';

export interface SnapshotData {
  topTags: Array<{ tag: string; interest: number }>;
  discoveredCount: number;
}

interface FeedbackSnapshotProps {
  snapshot: SnapshotData;
  locale: Locale;
  onContinue: () => void;
}

export function FeedbackSnapshot({ snapshot, locale, onContinue }: FeedbackSnapshotProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="mb-6 p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20"
        >
          <Sparkles className="size-10 text-pink-400" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {locale === 'ru' ? 'Узнали про тебя' : 'Here is what we learned'}
        </h2>
        <p className="text-gray-400 mb-8 max-w-sm">
          {locale === 'ru'
            ? `Ответов: ${snapshot.discoveredCount}. Вот главное:`
            : `${snapshot.discoveredCount} answers in. Top interests:`}
        </p>

        <div className="flex flex-col gap-2 w-full max-w-sm mb-10">
          {snapshot.topTags.map((item, idx) => (
            <motion.div
              key={item.tag}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10"
            >
              <span className="text-lg font-semibold text-white capitalize flex-1 text-left">
                {item.tag.replace(/-/g, ' ')}
              </span>
              <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.interest}%` }}
                  transition={{ delay: 0.4 + idx * 0.1, duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                />
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={onContinue}
          size="lg"
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-8"
        >
          {locale === 'ru' ? 'Продолжить' : 'Keep going'}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
