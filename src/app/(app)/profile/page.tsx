'use client';

import { useState, useEffect } from 'react';
import { PreferenceMap } from '@/components/profile/PreferenceMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState({ answered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile/me');
        if (!res.ok) return;
        const json = (await res.json()) as {
          profile?: Profile | null;
          preferences?: Record<string, unknown> | null;
          stats?: { answered?: number };
        };
        if (json.profile) setProfile(json.profile);
        if (json.preferences) setPreferences(json.preferences);
        setStats({ answered: json.stats?.answered ?? 0 });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const genderLabels: Record<string, string> = {
    male: 'Мужчина',
    female: 'Женщина',
    other: 'Другое',
  };

  const interestedLabels: Record<string, string> = {
    male: 'Мужчины',
    female: 'Женщины',
    both: 'Оба',
  };

  return (
    <div className="p-4 space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>Мой профиль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="secondary">
              {profile?.gender ? genderLabels[profile.gender] : 'Не указано'}
            </Badge>
            <Badge variant="outline">
              Интересуют: {profile?.interested_in ? interestedLabels[profile.interested_in] : 'Не указано'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.answered}</div>
              <div className="text-sm text-muted-foreground">Ответов</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {Object.keys(preferences).length}
              </div>
              <div className="text-sm text-muted-foreground">Измерений</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preference map */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Карта предпочтений</h2>
        <PreferenceMap preferences={preferences} />
      </div>
    </div>
  );
}
