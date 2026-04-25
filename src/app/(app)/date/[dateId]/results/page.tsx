'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/dates/${dateId}/results`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          waitingForPartner?: boolean;
          partnerName?: string;
          bothYes?: Scene[];
          bothMaybe?: Scene[];
        };

        if (json.partnerName) setPartnerName(json.partnerName);
        if (json.waitingForPartner) {
          setWaitingForPartner(true);
          return;
        }
        setBothYes(json.bothYes ?? []);
        setBothMaybe(json.bothMaybe ?? []);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [dateId]);

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
