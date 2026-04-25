'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DateCard } from '@/components/date/DateCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Heart, Plus } from 'lucide-react';

interface DateWithPartner {
  id: string;
  partnership_id: string;
  mood: string | null;
  status: string;
  scheduled_for: string | null;
  partnerName: string;
}

export default function DatesPage() {
  const [dates, setDates] = useState<DateWithPartner[]>([]);
  const [partnerships, setPartnerships] = useState<{ id: string; nickname: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDates() {
      try {
        const res = await fetch('/api/dates');
        if (!res.ok) return;
        const json = (await res.json()) as {
          dates?: DateWithPartner[];
          partnerships?: Array<{ id: string; nickname: string | null }>;
        };
        setPartnerships(json.partnerships ?? []);
        setDates(json.dates ?? []);
      } catch (error) {
        console.error('Error fetching dates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Create new date */}
      {partnerships.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Создать свидание</h3>
            <div className="flex flex-wrap gap-2">
              {partnerships.map((p) => (
                <Button key={p.id} asChild variant="outline" size="sm">
                  <Link href={`/date/new/${p.id}`}>
                    <Plus className="w-4 h-4 mr-1" />
                    {p.nickname}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dates list */}
      {dates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Нет свиданий</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте свидание с партнёром, чтобы узнать общие желания на вечер
            </p>
            {partnerships.length > 0 && (
              <Button asChild>
                <Link href={`/date/new/${partnerships[0].id}`}>
                  Создать свидание
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ваши свидания ({dates.length})
          </h2>
          {dates.map((date, index) => (
            <DateCard
              key={date.id}
              id={date.id}
              partnerName={date.partnerName}
              mood={date.mood}
              status={date.status}
              scheduledFor={date.scheduled_for}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
