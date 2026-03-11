'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DateResults } from '@/components/date/DateResults';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Scene } from '@/lib/types';

export default function DateResultsPage({ params }: { params: Promise<{ dateId: string }> }) {
  const { dateId } = use(params);
  const [bothYes, setBothYes] = useState<Scene[]>([]);
  const [bothMaybe, setBothMaybe] = useState<Scene[]>([]);
  const [partnerName, setPartnerName] = useState('Партнёр');
  const [loading, setLoading] = useState(true);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchResults() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get date and partnership
        const { data: dateData } = await supabase
          .from('dates')
          .select('partnership_id')
          .eq('id', dateId)
          .single();

        if (!dateData) return;

        const { data: partnership } = await supabase
          .from('partnerships')
          .select('user_id, partner_id, nickname')
          .eq('id', dateData.partnership_id)
          .single();

        if (partnership?.nickname) {
          setPartnerName(partnership.nickname);
        }

        // Get all responses for this date
        const { data: responses } = await supabase
          .from('date_responses')
          .select('user_id, scene_id, answer, scenes(*)')
          .eq('date_id', dateId);

        if (!responses) return;

        // Check if both users have responded
        const userIds = new Set(responses.map(r => r.user_id));
        if (userIds.size < 2) {
          setWaitingForPartner(true);
          return;
        }

        // Group by scene
        const byScene = new Map<string, Map<string, string>>();

        for (const r of responses) {
          if (!byScene.has(r.scene_id)) {
            byScene.set(r.scene_id, new Map());
          }
          byScene.get(r.scene_id)!.set(r.user_id, r.answer);
        }

        const yesScenes: Scene[] = [];
        const maybeScenes: Scene[] = [];

        for (const [sceneId, answers] of byScene) {
          if (answers.size !== 2) continue; // Both users need to answer

          const answerValues = Array.from(answers.values()) as string[];
          const responseWithScene = responses.find(r => r.scene_id === sceneId);
          const scene = (responseWithScene?.scenes as unknown) as Scene | null;

          if (!scene) continue;

          if (answerValues.every(a => a === 'yes')) {
            yesScenes.push(scene);
          } else if (answerValues.every(a => a === 'yes' || a === 'maybe')) {
            // At least one is 'yes' or 'maybe', none is 'no'
            maybeScenes.push(scene);
          }
        }

        setBothYes(yesScenes);
        setBothMaybe(maybeScenes);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [dateId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (waitingForPartner) {
    return (
      <div className="p-4 space-y-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/date">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к свиданиям
          </Link>
        </Button>
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Ждём партнёра</h2>
          <p className="text-muted-foreground">
            {partnerName} ещё не ответил(а). Результаты появятся, когда оба ответят.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/date">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к свиданиям
        </Link>
      </Button>

      <h1 className="text-2xl font-bold text-center">
        Результаты свидания
      </h1>

      <DateResults
        bothYes={bothYes}
        bothMaybe={bothMaybe}
        partnerName={partnerName}
      />
    </div>
  );
}
