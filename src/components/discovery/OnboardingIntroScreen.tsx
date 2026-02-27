'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/types';

interface OnboardingIntroScreenProps {
  locale: Locale;
  sceneCount: number;
  onStart: () => void;
}

export function OnboardingIntroScreen({ locale, sceneCount, onStart }: OnboardingIntroScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm space-y-6"
      >
        <h1 className="text-2xl font-bold">
          {locale === 'ru' ? 'Узнаём предпочтения' : 'Discovering preferences'}
        </h1>
        <p className="text-muted-foreground">
          {locale === 'ru'
            ? 'Мы покажем несколько категорий. Свайпай, чтобы рассказать о своих интересах.'
            : "We'll show you some categories. Swipe to tell us about your interests."}
        </p>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col items-center p-3 rounded-lg bg-red-50">
            <span className="text-2xl text-red-500">←</span>
            <span className="text-sm text-red-600 font-medium">
              {locale === 'ru' ? 'Нет' : 'No'}
            </span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-green-50">
            <span className="text-2xl text-green-500">→</span>
            <span className="text-sm text-green-600 font-medium">
              {locale === 'ru' ? 'Да' : 'Yes'}
            </span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-pink-50">
            <span className="text-2xl text-pink-500">↑</span>
            <span className="text-sm text-pink-600 font-medium">
              {locale === 'ru' ? 'Очень!' : 'Love it!'}
            </span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-amber-50">
            <span className="text-2xl text-amber-500">↓</span>
            <span className="text-sm text-amber-600 font-medium">
              {locale === 'ru' ? 'Если попросит' : 'If asked'}
            </span>
          </div>
        </div>

        <Button onClick={onStart} size="lg" className="w-full">
          {locale === 'ru' ? 'Начать' : 'Start'}
        </Button>

        <p className="text-xs text-muted-foreground">
          {locale === 'ru'
            ? `${sceneCount} категорий`
            : `${sceneCount} categories`}
        </p>
      </motion.div>
    </div>
  );
}
