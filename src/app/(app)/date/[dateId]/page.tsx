'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { QuickSceneCard } from '@/components/date/QuickSceneCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Clock } from 'lucide-react';
import type { Scene } from '@/lib/types';

export default function DateSessionPage({ params }: { params: Promise<{ dateId: string }> }) {
  const { dateId } = use(params);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const router = useRouter();

  const currentScene = scenes[currentIndex];
  const progress = scenes.length > 0 ? `${currentIndex + 1}/${scenes.length}` : '';

  const fetchScenes = useCallback(async () => {
    try {
      // Server-side: load partnership, run getTagBasedMatches, query scenes,
      // exclude already-answered, return derived shape only.
      const res = await fetch(`/api/dates/${dateId}/scenes`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        scenes?: Scene[];
        partnerCompleted?: boolean;
      };
      if (json.partnerCompleted) setPartnerCompleted(true);
      if (json.scenes && json.scenes.length > 0) {
        setScenes(json.scenes);
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  }, [dateId]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  const handleAnswer = async (answer: 'yes' | 'maybe' | 'no') => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/dates/${dateId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id: currentScene.id, answer }),
      });
      if (!res.ok) {
        console.error('Error saving answer:', res.status);
      } else {
        const json = (await res.json()) as { partnerCompleted?: boolean };
        if (json.partnerCompleted) setPartnerCompleted(true);
      }

      if (currentIndex < scenes.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Готово!</h2>
            {partnerCompleted ? (
              <>
                <p className="text-muted-foreground mb-6">
                  Оба ответили! Посмотрите ваши совпадения.
                </p>
                <Button onClick={() => router.push(`/date/${dateId}/results`)}>
                  Посмотреть результаты
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  Ваши ответы сохранены. Ждём, пока партнёр тоже ответит.
                </p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Ожидание партнёра...</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Progress */}
      <div className="text-center text-sm text-muted-foreground">
        {progress}
      </div>

      {/* Scene card */}
      <AnimatePresence mode="wait">
        {currentScene && (
          <QuickSceneCard
            key={currentScene.id}
            scene={currentScene}
            onAnswer={handleAnswer}
            loading={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
