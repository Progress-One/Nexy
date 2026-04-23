'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/http-client/client';
import { getTagBasedMatches, type TagPreference } from '@/lib/matching';
import { MatchList } from '@/components/partners/MatchList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, Lightbulb, Lock, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PartnerChat } from '@/components/partners/PartnerChat';
import type { MatchResult } from '@/lib/types';

export default function PartnerDetailPage({ params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = use(params);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Партнёр');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [actualPartnerId, setActualPartnerId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMatches() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get partnership details
        const { data: partnership } = await supabase
          .from('partnerships')
          .select('*')
          .eq('id', partnerId)
          .single();

        if (!partnership) return;

        // Determine actual partner ID
        const partnerUserId = partnership.user_id === user.id
          ? partnership.partner_id
          : partnership.user_id;

        setActualPartnerId(partnerUserId);

        if (partnership.nickname) {
          setPartnerName(partnership.nickname);
        }

        // Fetch tag_preferences for role-based matching
        const [myTags, partnerTagsResult] = await Promise.all([
          supabase
            .from('tag_preferences')
            .select('tag_ref, interest_level, role_preference')
            .eq('user_id', user.id),
          supabase
            .from('tag_preferences')
            .select('tag_ref, interest_level, role_preference')
            .eq('user_id', partnerUserId),
        ]);

        // Tag-based matching with role complementarity
        const tagResults = getTagBasedMatches(
          (myTags.data || []) as TagPreference[],
          (partnerTagsResult.data || []) as TagPreference[]
        );

        setMatches(tagResults.matches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [partnerId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">{partnerName}</h1>
          <Badge variant="secondary" className="bg-rose-100 text-rose-700">
            {matches.length} совпадений
          </Badge>
        </CardContent>
      </Card>

      {/* Matches */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">🔥</span>
          Совпадения
        </h2>
        <MatchList matches={matches} partnerName={partnerName} />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href={`/date/new/${partnerId}`}>
            <Heart className="w-4 h-4 mr-2" />
            Пригласить на свидание
          </Link>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/partners/${partnerId}/propose`}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Предложить вопрос
            <Lock className="w-3 h-3 ml-2 text-muted-foreground" />
          </Link>
        </Button>
      </div>

      {/* AI Partner Chat */}
      <div>
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowChat(!showChat)}
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Спросить у AI-аватара {partnerName}
          </span>
          {showChat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showChat && actualPartnerId && (
          <div className="mt-4">
            <PartnerChat partnerId={actualPartnerId} partnerName={partnerName} />
          </div>
        )}
      </div>
    </div>
  );
}
