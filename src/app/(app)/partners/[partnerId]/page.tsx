'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getCategorizedMatches,
  type TagPreference,
  type CategorizedMatches,
  type MatchCategory,
  type CategorizedMatch,
} from '@/lib/matching';
import { MatchPill } from '@/components/partners/MatchPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Heart,
  Lightbulb,
  Lock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Sparkles,
  Star,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { PartnerChat } from '@/components/partners/PartnerChat';
import { t, getLocale, type Locale } from '@/lib/locale';

const EMPTY_MATCHES: CategorizedMatches = {
  mutual_open: [],
  mutual_hidden: [],
  role_conflict: [],
  partner_wants: [],
  you_want: [],
  totalAnswered: 0,
};

interface SectionConfig {
  key: keyof Omit<CategorizedMatches, 'totalAnswered'>;
  category: MatchCategory;
  titleKey: Parameters<typeof t>[0];
  explainKey?: Parameters<typeof t>[0];
  Icon: typeof Sparkles;
  accent: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'mutual_open',
    category: 'mutual_open',
    titleKey: 'matchesMutualOpen',
    Icon: Sparkles,
    accent: 'text-rose-500',
  },
  {
    key: 'mutual_hidden',
    category: 'mutual_hidden',
    titleKey: 'matchesMutualHidden',
    explainKey: 'matchesHiddenExplain',
    Icon: Star,
    accent: 'text-amber-500',
  },
  {
    key: 'partner_wants',
    category: 'partner_wants',
    titleKey: 'matchesPartnerWants',
    Icon: Lightbulb,
    accent: 'text-violet-500',
  },
  {
    key: 'you_want',
    category: 'you_want',
    titleKey: 'matchesYouWant',
    Icon: Eye,
    accent: 'text-muted-foreground',
  },
  {
    key: 'role_conflict',
    category: 'role_conflict',
    titleKey: 'matchesRoleConflict',
    explainKey: 'matchesRoleConflictExplain',
    Icon: AlertTriangle,
    accent: 'text-orange-500',
  },
];

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = use(params);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Partner');
  const [categorized, setCategorized] = useState<CategorizedMatches>(EMPTY_MATCHES);
  const [showChat, setShowChat] = useState(false);
  const [actualPartnerId, setActualPartnerId] = useState<string | null>(null);
  const [hasMyData, setHasMyData] = useState(false);
  const [hasPartnerData, setHasPartnerData] = useState(false);
  const [connectedDays, setConnectedDays] = useState<number | null>(null);
  const [locale, setLocale] = useState<Locale>('en');
  const supabase = createClient();

  useEffect(() => {
    async function fetchMatches() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Profile for locale.
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();
        setLocale(getLocale(profile));

        const { data: partnership } = await supabase
          .from('partnerships')
          .select('*')
          .eq('id', partnerId)
          .single();

        if (!partnership) return;

        const partnerUserId =
          partnership.user_id === user.id
            ? partnership.partner_id
            : partnership.user_id;

        setActualPartnerId(partnerUserId);

        if (partnership.nickname) {
          setPartnerName(partnership.nickname);
        }

        if (partnership.created_at) {
          const diffMs = Date.now() - new Date(partnership.created_at).getTime();
          setConnectedDays(Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
        }

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

        const myData = (myTags.data || []) as TagPreference[];
        const partnerData = (partnerTagsResult.data || []) as TagPreference[];
        setHasMyData(myData.length > 0);
        setHasPartnerData(partnerData.length > 0);

        setCategorized(getCategorizedMatches(myData, partnerData));
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

  const mutualOpenCount = categorized.mutual_open.length;
  const hiddenCount = categorized.mutual_hidden.length;
  const percent =
    categorized.totalAnswered > 0
      ? Math.round((mutualOpenCount / categorized.totalAnswered) * 100)
      : 0;

  const bothEmpty = !hasMyData && !hasPartnerData;
  const partnerEmpty = hasMyData && !hasPartnerData;

  const renderPills = (list: CategorizedMatch[], category: MatchCategory) =>
    list.map((m) => (
      <MatchPill
        key={`${category}-${m.tag}`}
        tag={m.tag}
        category={category}
        myInterest={m.myInterest}
        partnerInterest={m.partnerInterest}
        locale={locale}
      />
    ));

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/partners" aria-label={t('back', locale)}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{partnerName}</h1>
            <p className="text-sm text-muted-foreground">
              {t('matchesConnected', locale)}
              {connectedDays !== null && ` · ${connectedDays}d`}
            </p>
          </div>
        </div>

        {/* Summary header */}
        <Card>
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-3xl font-bold text-rose-600">
                {mutualOpenCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('matchesHeaderCount', locale, { count: mutualOpenCount })}
              </div>
            </div>
            {hiddenCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 border-amber-200"
              >
                <Star className="w-3.5 h-3.5 mr-1" />
                {t('matchesHeaderHidden', locale, { count: hiddenCount })}
              </Badge>
            )}
            {categorized.totalAnswered > 0 && (
              <Badge
                variant="outline"
                className="text-rose-700 border-rose-200 bg-rose-50"
              >
                {t('matchesPercentage', locale, { percent })}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Empty states */}
        {bothEmpty && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>{t('matchesNoData', locale)}</p>
            </CardContent>
          </Card>
        )}

        {partnerEmpty && !bothEmpty && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>
                {t('matchesWaitingPartner', locale, { name: partnerName })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Match sections */}
        {!bothEmpty &&
          !partnerEmpty &&
          SECTIONS.map(({ key, category, titleKey, explainKey, Icon, accent }) => {
            const list = categorized[key];
            if (list.length === 0) return null;

            return (
              <section key={key}>
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${accent}`} />
                  <span>
                    {t(titleKey, locale)} — {list.length}
                  </span>
                </h2>
                {explainKey && (
                  <p className="text-sm text-muted-foreground mb-3 ml-7">
                    {t(explainKey, locale)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 ml-7">
                  {renderPills(list, category)}
                </div>
              </section>
            );
          })}

        {/* Actions */}
        <div className="space-y-3 pt-2">
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
            {showChat ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showChat && actualPartnerId && (
            <div className="mt-4">
              <PartnerChat partnerId={actualPartnerId} partnerName={partnerName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
