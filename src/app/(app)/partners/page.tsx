'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PartnerCard } from '@/components/partners/PartnerCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, Users } from 'lucide-react';

interface Partnership {
  id: string;
  partner_id: string;
  user_id: string;
  nickname: string | null;
  status: string;
}

export default function PartnersPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartnerships() {
      try {
        const res = await fetch('/api/partners/list?status=any');
        if (!res.ok) return;
        const json = (await res.json()) as { partnerships?: Partnership[] };
        setPartnerships(json.partnerships ?? []);
      } catch (error) {
        console.error('Error fetching partnerships:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPartnerships();
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
      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild className="flex-1">
          <Link href="/partners/invite">
            <UserPlus className="w-4 h-4 mr-2" />
            Пригласить
          </Link>
        </Button>
      </div>

      {/* Partners list */}
      {partnerships.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Нет партнёров</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Пригласите партнёра, чтобы узнать ваши совпадения
            </p>
            <Button asChild>
              <Link href="/partners/invite">Пригласить партнёра</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ваши партнёры ({partnerships.length})
          </h2>
          {partnerships.map((partnership, index) => (
            <PartnerCard
              key={partnership.id}
              id={partnership.id}
              partnerId={partnership.partner_id}
              nickname={partnership.nickname}
              status={partnership.status}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
