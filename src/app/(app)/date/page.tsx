'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/http-client/client';
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
  const supabase = createClient();

  useEffect(() => {
    async function fetchDates() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get partnerships
        const { data: partnershipData } = await supabase
          .from('partnerships')
          .select('id, nickname, user_id, partner_id')
          .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
          .eq('status', 'active');

        if (partnershipData) {
          setPartnerships(partnershipData.map(p => ({
            id: p.id,
            nickname: p.nickname || 'Партнёр'
          })));
        }

        // Get dates for all partnerships
        const partnershipIds = partnershipData?.map(p => p.id) || [];

        if (partnershipIds.length > 0) {
          const { data: datesData } = await supabase
            .from('dates')
            .select('*')
            .in('partnership_id', partnershipIds)
            .order('created_at', { ascending: false });

          if (datesData) {
            const datesWithPartners = datesData.map(d => {
              const partnership = partnershipData?.find(p => p.id === d.partnership_id);
              return {
                ...d,
                partnerName: partnership?.nickname || 'Партнёр',
              };
            });
            setDates(datesWithPartners);
          }
        }
      } catch (error) {
        console.error('Error fetching dates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDates();
  }, [supabase]);

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
