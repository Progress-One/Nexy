'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { OnboardingResult } from '@/hooks/useDiscovery';
import type { Locale } from '@/lib/types';

interface OnboardingResultsScreenProps {
  locale: Locale;
  results: OnboardingResult[];
  loading: boolean;
  onContinue: () => void;
}

export function OnboardingResultsScreen({ locale, results, loading, onContinue }: OnboardingResultsScreenProps) {
  const veryInterested = results.filter(r => r.responseValue === 2);
  const interested = results.filter(r => r.responseValue === 1);
  const ifAsked = results.filter(r => r.responseValue === 3);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">
          {locale === 'ru' ? 'Готово!' : 'Done!'}
        </h1>

        {results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              {locale === 'ru' ? 'Тебе может быть интересно:' : 'You might be interested in:'}
            </p>

            {veryInterested.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-pink-600">
                  🔥 {locale === 'ru' ? 'Сильный интерес' : 'Strong interest'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {veryInterested.map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                      {r.title[locale] || r.title.ru || r.title.en}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {interested.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">
                  ✓ {locale === 'ru' ? 'Интерес' : 'Interested'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {interested.map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {r.title[locale] || r.title.ru || r.title.en}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ifAsked.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-600">
                  💬 {locale === 'ru' ? 'Если попросит партнёр' : 'If partner asks'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ifAsked.map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                      {r.title[locale] || r.title.ru || r.title.en}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            {locale === 'ru'
              ? 'Теперь мы знаем немного больше о твоих предпочтениях'
              : 'Now we know a bit more about your preferences'}
          </p>
        )}

        <Button onClick={onContinue} size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {locale === 'ru' ? 'Продолжить' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
}
