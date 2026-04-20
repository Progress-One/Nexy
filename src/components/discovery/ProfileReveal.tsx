'use client';

import { motion } from 'framer-motion';
import { Flame, Lightbulb, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/types';

export interface ProfileRevealData {
  topInterests: Array<{ tag: string; level: number }>;
  surpriseDiscovery?: { tag: string; reason: string };
  roleBalance?: { give: number; receive: number };
  totalAnswered: number;
}

interface ProfileRevealProps {
  data: ProfileRevealData;
  locale: Locale;
  hasPartner: boolean;
  onContinue: () => void;
  onInvitePartner?: () => void;
}

export function ProfileReveal({
  data,
  locale,
  hasPartner,
  onContinue,
  onInvitePartner,
}: ProfileRevealProps) {
  const total = (data.roleBalance?.give ?? 0) + (data.roleBalance?.receive ?? 0);
  const givePct = total > 0 ? Math.round(((data.roleBalance?.give ?? 0) / total) * 100) : 50;
  const receivePct = 100 - givePct;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-6 py-10">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {locale === 'ru' ? 'Твой профиль' : 'Your profile'}
          </h1>
          <p className="text-gray-400">
            {locale === 'ru'
              ? `На основе ${data.totalAnswered} ответов`
              : `Based on ${data.totalAnswered} answers`}
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="size-5 text-pink-400" />
            <h2 className="font-semibold text-white">
              {locale === 'ru' ? 'Топ интересы' : 'Top interests'}
            </h2>
          </div>
          <div className="space-y-3">
            {data.topInterests.slice(0, 3).map((item, idx) => (
              <div key={item.tag} className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white/40 w-6">{idx + 1}</span>
                <div className="flex-1">
                  <div className="text-white capitalize mb-1">
                    {item.tag.replace(/-/g, ' ')}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.level}%` }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {data.surpriseDiscovery && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="size-5 text-yellow-400" />
              <h2 className="font-semibold text-white">
                {locale === 'ru' ? 'Открытие' : 'Discovery'}
              </h2>
            </div>
            <p className="text-white font-medium capitalize mb-1">
              {data.surpriseDiscovery.tag.replace(/-/g, ' ')}
            </p>
            <p className="text-gray-400 text-sm">{data.surpriseDiscovery.reason}</p>
          </motion.section>
        )}

        {data.roleBalance && total > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 p-5 rounded-2xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-5 text-pink-400" />
              <h2 className="font-semibold text-white">
                {locale === 'ru' ? 'Роли' : 'Roles'}
              </h2>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
              <div
                style={{ width: `${givePct}%` }}
                className="bg-gradient-to-r from-pink-500 to-pink-400"
              />
              <div
                style={{ width: `${receivePct}%` }}
                className="bg-gradient-to-r from-purple-400 to-purple-500"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{locale === 'ru' ? 'Даю' : 'Give'} {givePct}%</span>
              <span>{receivePct}% {locale === 'ru' ? 'Получаю' : 'Receive'}</span>
            </div>
          </motion.section>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3"
        >
          {!hasPartner && onInvitePartner && (
            <Button
              onClick={onInvitePartner}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold"
            >
              <UserPlus className="size-5 mr-2" />
              {locale === 'ru' ? 'Пригласить партнёра и сравнить' : 'Invite partner & compare'}
            </Button>
          )}
          <Button
            onClick={onContinue}
            variant={hasPartner || !onInvitePartner ? 'default' : 'outline'}
            size="lg"
            className={
              hasPartner || !onInvitePartner
                ? 'w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold'
                : 'w-full border-white/20 text-white hover:bg-white/5'
            }
          >
            {locale === 'ru' ? 'Продолжить исследование' : 'Keep exploring'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
