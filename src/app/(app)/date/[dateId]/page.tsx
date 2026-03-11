'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getTagBasedMatches, type TagPreference } from '@/lib/matching';
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
  const supabase = createClient();

  const currentScene = scenes[currentIndex];
  const progress = scenes.length > 0 ? `${currentIndex + 1}/${scenes.length}` : '';

  const fetchScenes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get date details
      const { data: dateData } = await supabase
        .from('dates')
        .select('partnership_id, mood')
        .eq('id', dateId)
        .single();

      if (!dateData) return;

      // Get partnership to find partner
      const { data: partnership } = await supabase
        .from('partnerships')
        .select('user_id, partner_id')
        .eq('id', dateData.partnership_id)
        .single();

      if (!partnership) return;

      const partnerId = partnership.user_id === user.id
        ? partnership.partner_id
        : partnership.user_id;

      // Get both users' tag preferences for matching
      const [myTags, partnerTagsResult] = await Promise.all([
        supabase.from('tag_preferences').select('tag_ref, interest_level, role_preference').eq('user_id', user.id),
        supabase.from('tag_preferences').select('tag_ref, interest_level, role_preference').eq('user_id', partnerId),
      ]);

      // Tag-based matching with role complementarity
      const tagResults = getTagBasedMatches(
        (myTags.data || []) as TagPreference[],
        (partnerTagsResult.data || []) as TagPreference[]
      );

      // Get matched tag_refs to find relevant scenes
      const matchedTags = tagResults.matches.map(m => m.dimension);

      // Get already answered scenes for this date
      const { data: answered } = await supabase
        .from('date_responses')
        .select('scene_id')
        .eq('date_id', dateId)
        .eq('user_id', user.id);

      const answeredIds = answered?.map(a => a.scene_id) || [];

      // Check if partner has already completed their answers
      const { data: partnerAnswered } = await supabase
        .from('date_responses')
        .select('scene_id')
        .eq('date_id', dateId)
        .eq('user_id', partnerId);

      if (partnerAnswered && partnerAnswered.length > 0) {
        setPartnerCompleted(true);
      }

      // Map mood to intensity range
      const moodIntensity: Record<string, { min: number; max: number }> = {
        tender:     { min: 1, max: 2 },
        playful:    { min: 1, max: 3 },
        passionate: { min: 2, max: 4 },
        intense:    { min: 3, max: 5 },
        surprise:   { min: 1, max: 5 },
      };
      const intensity = moodIntensity[dateData.mood || 'surprise'] || moodIntensity.surprise;

      // Fetch V2 scenes that match the shared interests via tags
      let query = supabase
        .from('scenes')
        .select('*')
        .eq('version', 2)
        .eq('is_active', true)
        .gte('intensity', intensity.min)
        .lte('intensity', intensity.max)
        .limit(5);

      if (matchedTags.length > 0) {
        query = query.overlaps('tags', matchedTags);
      }

      if (answeredIds.length > 0) {
        query = query.not('id', 'in', `(${answeredIds.join(',')})`);
      }

      const { data: scenesData } = await query;

      if (scenesData && scenesData.length > 0) {
        setScenes(scenesData as Scene[]);
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  }, [dateId, supabase]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  const handleAnswer = async (answer: 'yes' | 'maybe' | 'no') => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('date_responses').insert({
        date_id: dateId,
        user_id: user.id,
        scene_id: currentScene.id,
        answer,
      });

      if (currentIndex < scenes.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Check if partner already answered — if so, mark date as ready
        const { data: dateData } = await supabase
          .from('dates')
          .select('partnership_id')
          .eq('id', dateId)
          .single();

        if (dateData) {
          const { data: partnership } = await supabase
            .from('partnerships')
            .select('user_id, partner_id')
            .eq('id', dateData.partnership_id)
            .single();

          if (partnership) {
            const partnerUserId = partnership.user_id === user.id
              ? partnership.partner_id
              : partnership.user_id;

            const { data: partnerResponses } = await supabase
              .from('date_responses')
              .select('id')
              .eq('date_id', dateId)
              .eq('user_id', partnerUserId)
              .limit(1);

            if (partnerResponses && partnerResponses.length > 0) {
              // Both answered — mark as ready
              await supabase
                .from('dates')
                .update({ status: 'ready' })
                .eq('id', dateId);
              setPartnerCompleted(true);
            }
          }
        }

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
