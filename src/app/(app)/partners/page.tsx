'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PartnerCard } from '@/components/partners/PartnerCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, Users } from 'lucide-react';
import {
  getCategorizedMatches,
  type TagPreference,
} from '@/lib/matching';

interface Partnership {
  id: string;
  partner_id: string;
  user_id: string;
  nickname: string | null;
  status: string;
  matchCount?: number;
  hiddenCount?: number;
}

export default function PartnersPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPartnerships() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch partnerships where user is either user_id or partner_id
        const { data } = await supabase
          .from('partnerships')
          .select('*')
          .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (data) {
          // Transform to always have the "other" person as partner
          const transformed = data.map((p) => ({
            ...p,
            partner_id: p.user_id === user.id ? p.partner_id : p.user_id,
          }));

          // Fetch my tags once + partner tags per partnership, then compute counts.
          const { data: myTagsData } = await supabase
            .from('tag_preferences')
            .select('tag_ref, interest_level, role_preference')
            .eq('user_id', user.id);
          const myTags = (myTagsData || []) as TagPreference[];

          const withCounts = await Promise.all(
            transformed.map(async (p) => {
              const { data: partnerTagsData } = await supabase
                .from('tag_preferences')
                .select('tag_ref, interest_level, role_preference')
                .eq('user_id', p.partner_id);
              const partnerTags = (partnerTagsData || []) as TagPreference[];
              const c = getCategorizedMatches(myTags, partnerTags);
              return {
                ...p,
                matchCount: c.mutual_open.length,
                hiddenCount: c.mutual_hidden.length,
              };
            })
          );

          setPartnerships(withCounts);
        }
      } catch (error) {
        console.error('Error fetching partnerships:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPartnerships();
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
              matchCount={partnership.matchCount}
              hiddenCount={partnership.hiddenCount}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
