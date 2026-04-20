'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Heart, Zap } from 'lucide-react';
import type { Locale } from '@/lib/types';

interface ValueIntroProps {
  locale: Locale;
  onComplete: () => void;
}

const SLIDES = {
  ru: [
    {
      icon: Heart,
      title: 'Узнай что нравится вам обоим',
      body: 'Без неловких разговоров. Свайпай — мы найдём совпадения.',
    },
    {
      icon: Zap,
      title: 'Свайп как в Tinder',
      body: '30 секунд на тему. YES, NO, VERY или "только если партнёр тоже".',
    },
    {
      icon: Shield,
      title: 'Только для вас двоих',
      body: 'Несовпадающие ответы никто не видит — ни партнёр, ни мы.',
    },
  ],
  en: [
    {
      icon: Heart,
      title: 'Learn what you both want',
      body: 'No awkward talks. Swipe and we find matches.',
    },
    {
      icon: Zap,
      title: 'Swipe like Tinder',
      body: '30 seconds per topic. YES, NO, VERY or "only if partner too".',
    },
    {
      icon: Shield,
      title: 'Private to you two',
      body: 'Unmatched answers are never shown — not to your partner, not to us.',
    },
  ],
};

export function ValueIntro({ locale, onComplete }: ValueIntroProps) {
  const [index, setIndex] = useState(0);
  const slides = SLIDES[locale] || SLIDES.en;
  const slide = slides[index];
  const Icon = slide.icon;
  const isLast = index === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black px-6">
      <div className="w-full max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="mb-10"
          >
            <div className="mb-8 inline-flex p-5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Icon className="size-12 text-pink-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{slide.title}</h1>
            <p className="text-gray-400 text-lg leading-relaxed">{slide.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 justify-center mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-8 bg-pink-500' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={() => (isLast ? onComplete() : setIndex(index + 1))}
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold"
        >
          {isLast
            ? locale === 'ru'
              ? 'Поехали'
              : "Let's go"
            : locale === 'ru'
              ? 'Далее'
              : 'Next'}
        </Button>

        {!isLast && (
          <button
            onClick={onComplete}
            className="mt-4 text-sm text-gray-500 hover:text-gray-300"
          >
            {locale === 'ru' ? 'Пропустить' : 'Skip'}
          </button>
        )}
      </div>
    </div>
  );
}
