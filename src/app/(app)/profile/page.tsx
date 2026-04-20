'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { computeUserInsights, humanizeTag, type InsightsData } from '@/lib/insights';
import {
  getPersonalRecommendations,
  type PersonalRecommendation,
} from '@/lib/recommendations';
import { getLocale } from '@/lib/locale';
import type { Locale, Profile } from '@/lib/types';

const COPY = {
  title: { ru: 'Мой профиль', en: 'My profile' },
  archetypeHeading: { ru: 'Твой архетип', en: 'Your archetype' },
  noArchetype: {
    ru: 'Мы ещё не определили твой архетип. Продолжай свайпать.',
    en: "We haven't locked in your archetype yet. Keep swiping.",
  },
  showMore: { ru: 'Подробнее', en: 'Show more' },
  showLess: { ru: 'Свернуть', en: 'Show less' },
  topInterestsHeading: { ru: 'Топ 5 интересов', en: 'Top 5 interests' },
  noInterests: {
    ru: 'Мы пока не накопили данных по твоим интересам.',
    en: 'We have not gathered enough interest data yet.',
  },
  styleHeading: { ru: 'Стиль взаимодействия', en: 'Interaction style' },
  roleLabel: { ru: 'Давать vs получать', en: 'Give vs receive' },
  intensityLabel: { ru: 'Интенсивность', en: 'Intensity' },
  experienceLabel: { ru: 'Опыт', en: 'Experience' },
  soft: { ru: 'Мягко', en: 'Soft' },
  moderate: { ru: 'Средне', en: 'Moderate' },
  intense: { ru: 'Интенсивно', en: 'Intense' },
  tried: { ru: 'Пробовал', en: 'Tried' },
  curious: { ru: 'Любопытно', en: 'Curious' },
  wantToTry: { ru: 'Хочу попробовать', en: 'Want to try' },
  notInterested: { ru: 'Не интересно', en: 'Not interested' },
  give: { ru: 'Давать', en: 'Give' },
  receive: { ru: 'Получать', en: 'Receive' },
  both: { ru: 'Оба', en: 'Both' },
  bodyHeading: { ru: 'Твоё тело', en: 'Your body' },
  lovedZones: {
    ru: 'Зоны, где ты любишь прикосновения',
    en: 'Zones where you love touch',
  },
  dislikedZones: {
    ru: 'Зоны, которых лучше избегать',
    en: 'Zones to avoid',
  },
  noBodyData: {
    ru: 'Ты ещё не отметил свои зоны на body map.',
    en: 'You have not marked your body map zones yet.',
  },
  statsAnswered: { ru: 'Ответов', en: 'Answers' },
  statsHighInterest: { ru: 'Высокий интерес', en: 'High interest' },
  statsDays: { ru: 'Дней в discovery', en: 'Days in discovery' },
  tryHeading: { ru: 'Попробуй эти сцены', en: 'Try these scenes' },
  tryEmpty: {
    ru: 'Рекомендации появятся после ещё нескольких ответов.',
    en: 'Recommendations will appear after a few more answers.',
  },
  genderMale: { ru: 'Мужчина', en: 'Male' },
  genderFemale: { ru: 'Женщина', en: 'Female' },
  genderOther: { ru: 'Другое', en: 'Other' },
  interestedMale: { ru: 'Мужчины', en: 'Men' },
  interestedFemale: { ru: 'Женщины', en: 'Women' },
  interestedBoth: { ru: 'Оба', en: 'Both' },
  notSpecified: { ru: 'Не указано', en: 'Not specified' },
  interestedIn: { ru: 'Интересуют', en: 'Interested in' },
} as const;

function localized<T extends keyof typeof COPY>(key: T, locale: Locale): string {
  return COPY[key][locale];
}

function humanizeZone(zone: string, locale: Locale): string {
  const dict: Record<string, { ru: string; en: string }> = {
    lips: { ru: 'Губы', en: 'Lips' },
    ears: { ru: 'Уши', en: 'Ears' },
    neck: { ru: 'Шея', en: 'Neck' },
    shoulders: { ru: 'Плечи', en: 'Shoulders' },
    chest: { ru: 'Грудь', en: 'Chest' },
    breasts: { ru: 'Грудь', en: 'Breasts' },
    nipples: { ru: 'Соски', en: 'Nipples' },
    stomach: { ru: 'Живот', en: 'Stomach' },
    belly: { ru: 'Живот', en: 'Belly' },
    back: { ru: 'Спина', en: 'Back' },
    upper_back: { ru: 'Верх спины', en: 'Upper back' },
    lower_back: { ru: 'Низ спины', en: 'Lower back' },
    arms: { ru: 'Руки', en: 'Arms' },
    hands: { ru: 'Ладони', en: 'Hands' },
    fingers: { ru: 'Пальцы', en: 'Fingers' },
    buttocks: { ru: 'Ягодицы', en: 'Buttocks' },
    anus: { ru: 'Анус', en: 'Anus' },
    groin: { ru: 'Пах', en: 'Groin' },
    penis: { ru: 'Пенис', en: 'Penis' },
    testicles: { ru: 'Мошонка', en: 'Testicles' },
    vulva: { ru: 'Вульва', en: 'Vulva' },
    clitoris: { ru: 'Клитор', en: 'Clitoris' },
    inner_thighs: { ru: 'Внутренние стороны бёдер', en: 'Inner thighs' },
    thighs: { ru: 'Бёдра', en: 'Thighs' },
    feet: { ru: 'Стопы', en: 'Feet' },
    cheeks: { ru: 'Щёки', en: 'Cheeks' },
    hair: { ru: 'Волосы', en: 'Hair' },
    nape: { ru: 'Затылок', en: 'Nape' },
  };
  const entry = dict[zone];
  if (entry) return entry[locale];
  return humanizeTag(zone);
}

function interestColor(level: number): string {
  if (level >= 80) return 'from-pink-500 to-purple-500';
  if (level >= 60) return 'from-pink-500 to-pink-400';
  if (level >= 40) return 'from-purple-400 to-purple-500';
  return 'from-gray-400 to-gray-500';
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [recommendations, setRecommendations] = useState<PersonalRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [archetypeExpanded, setArchetypeExpanded] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const resolvedLocale = getLocale(profileData as Profile | null);
        if (!cancelled) {
          setProfile((profileData as Profile | null) ?? null);
          setLocale(resolvedLocale);
        }

        const [insightsData, recs] = await Promise.all([
          computeUserInsights(supabase, user.id, resolvedLocale, { topTagLimit: 5 }),
          getPersonalRecommendations(supabase, user.id, 5, resolvedLocale).catch(() => []),
        ]);

        if (!cancelled) {
          setInsights(insightsData);
          setRecommendations(recs);
        }
      } catch (err) {
        console.error('[ProfilePage] Failed to load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const genderLabel = (() => {
    if (!profile?.gender) return localized('notSpecified', locale);
    if (profile.gender === 'male') return localized('genderMale', locale);
    if (profile.gender === 'female') return localized('genderFemale', locale);
    return localized('genderOther', locale);
  })();

  const interestedLabel = (() => {
    if (!profile?.interested_in) return localized('notSpecified', locale);
    if (profile.interested_in === 'male') return localized('interestedMale', locale);
    if (profile.interested_in === 'female') return localized('interestedFemale', locale);
    return localized('interestedBoth', locale);
  })();

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-2xl font-bold">{localized('title', locale)}</h1>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">{genderLabel}</Badge>
        <Badge variant="outline">
          {localized('interestedIn', locale)}: {interestedLabel}
        </Badge>
      </div>

      {/* 1. Archetype */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" />
            {localized('archetypeHeading', locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights?.archetype ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-5xl" aria-hidden>{insights.archetype.emoji}</div>
                <div>
                  <div className="text-xl font-semibold">{insights.archetype.name}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insights.archetype.summary}
                  </p>
                </div>
              </div>

              {archetypeExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {insights.archetype.description}
                  {insights.secondaryArchetypes.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        {locale === 'ru' ? 'Также проявляется' : 'Also showing'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {insights.secondaryArchetypes.map((a) => (
                          <Badge key={a.id} variant="secondary" className="gap-1">
                            <span>{a.emoji}</span>
                            <span>{a.name}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setArchetypeExpanded((v) => !v)}
                className="gap-1 text-pink-600 hover:text-pink-700"
              >
                {archetypeExpanded ? (
                  <>
                    {localized('showLess', locale)}
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {localized('showMore', locale)}
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{localized('noArchetype', locale)}</p>
          )}
        </CardContent>
      </Card>

      {/* 2. Top interests */}
      <Card>
        <CardHeader>
          <CardTitle>{localized('topInterestsHeading', locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          {insights && insights.topTags.length > 0 ? (
            <ul className="space-y-3">
              {insights.topTags.map((t) => (
                <li key={t.tag} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground tabular-nums">{t.level}</span>
                  </div>
                  <ProgressBar value={t.level} colorClass={interestColor(t.level)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{localized('noInterests', locale)}</p>
          )}
        </CardContent>
      </Card>

      {/* 3. Interaction style */}
      <Card>
        <CardHeader>
          <CardTitle>{localized('styleHeading', locale)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Role balance */}
          <div className="space-y-2">
            <div className="text-sm font-medium">{localized('roleLabel', locale)}</div>
            {insights && insights.roleBalance.sampleSize > 0 ? (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{localized('give', locale)} {insights.roleBalance.give}%</span>
                  <span>{localized('both', locale)} {insights.roleBalance.both}%</span>
                  <span>{insights.roleBalance.receive}% {localized('receive', locale)}</span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden bg-muted flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.roleBalance.give}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-gradient-to-r from-pink-500 to-pink-400"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.roleBalance.both}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-full bg-gradient-to-r from-pink-400 to-purple-400"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.roleBalance.receive}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {locale === 'ru' ? 'Недостаточно данных' : 'Not enough data'}
              </p>
            )}
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <div className="text-sm font-medium">{localized('intensityLabel', locale)}</div>
            {insights && insights.intensity.sampleSize > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <IntensitySlot
                  label={localized('soft', locale)}
                  value={insights.intensity.soft}
                  colorClass="from-emerald-400 to-emerald-500"
                />
                <IntensitySlot
                  label={localized('moderate', locale)}
                  value={insights.intensity.moderate}
                  colorClass="from-amber-400 to-orange-500"
                />
                <IntensitySlot
                  label={localized('intense', locale)}
                  value={insights.intensity.intense}
                  colorClass="from-pink-500 to-red-500"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {locale === 'ru' ? 'Недостаточно данных' : 'Not enough data'}
              </p>
            )}
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <div className="text-sm font-medium">{localized('experienceLabel', locale)}</div>
            {insights && insights.experience.sampleSize > 0 ? (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {localized('tried', locale)}: {insights.experience.tried}%
                </Badge>
                <Badge variant="secondary">
                  {localized('curious', locale)}: {insights.experience.curious}%
                </Badge>
                <Badge variant="secondary">
                  {localized('wantToTry', locale)}: {insights.experience.want_to_try}%
                </Badge>
                <Badge variant="outline">
                  {localized('notInterested', locale)}: {insights.experience.not_interested}%
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {locale === 'ru' ? 'Недостаточно данных' : 'Not enough data'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Body */}
      {insights?.bodyMap.hasData && (
        <Card>
          <CardHeader>
            <CardTitle>{localized('bodyHeading', locale)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.bodyMap.lovedZones.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">{localized('lovedZones', locale)}</div>
                <div className="flex flex-wrap gap-2">
                  {insights.bodyMap.lovedZones.map((zone) => (
                    <Badge key={`love-${zone}`} className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                      {humanizeZone(zone, locale)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {insights.bodyMap.dislikedZones.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">{localized('dislikedZones', locale)}</div>
                <div className="flex flex-wrap gap-2">
                  {insights.bodyMap.dislikedZones.map((zone) => (
                    <Badge
                      key={`no-${zone}`}
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      {humanizeZone(zone, locale)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {insights && !insights.bodyMap.hasData && (
        <Card>
          <CardHeader>
            <CardTitle>{localized('bodyHeading', locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{localized('noBodyData', locale)}</p>
          </CardContent>
        </Card>
      )}

      {/* 5. Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>{localized('tryHeading', locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recommendations.map(({ scene, reason, reasonKey }) => {
                const title =
                  (scene.title && (scene.title[locale] || scene.title.en || scene.title.ru)) ||
                  scene.slug ||
                  scene.id;
                const imageUrl = scene.image_url ?? null;
                return (
                  <li
                    key={scene.id}
                    className="rounded-lg border bg-card p-3 flex gap-3 items-start"
                  >
                    {imageUrl ? (
                      <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={imageUrl}
                          alt={title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-gradient-to-br from-pink-200 to-purple-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-medium line-clamp-2">{title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{reason}</div>
                      <div className="text-[10px] uppercase tracking-widest text-pink-500/80">
                        {reasonKey.replace('_', ' ')}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{localized('tryEmpty', locale)}</p>
          )}
        </CardContent>
      </Card>

      {/* 6. Counters */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={insights?.counters.answeredCount ?? 0} label={localized('statsAnswered', locale)} />
        <StatCard
          value={insights?.counters.highInterestTags ?? 0}
          label={localized('statsHighInterest', locale)}
        />
        <StatCard
          value={insights?.counters.daysInDiscovery ?? 0}
          label={localized('statsDays', locale)}
        />
      </div>
    </div>
  );
}

function IntensitySlot({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{pct}%</div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground leading-tight mt-1">{label}</div>
    </div>
  );
}
