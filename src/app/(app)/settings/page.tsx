'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/http-client/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Trash2, User, Shield, Languages } from 'lucide-react';
import { getLocale, setLocale, t, type Locale } from '@/lib/locale';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/settings/me');
        if (!res.ok) {
          setCurrentLocale(getLocale());
          return;
        }
        const json = (await res.json()) as { profile?: Profile | null };
        if (json.profile) {
          setProfile(json.profile);
          setCurrentLocale(getLocale(json.profile));
        } else {
          setCurrentLocale(getLocale());
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setCurrentLocale(getLocale());
      }
    }

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(t('deleteAccountConfirm', currentLocale));

    if (confirmed) {
      // In production, this would call a server action to delete the user
      alert(t('deleteAccountContact', currentLocale));
    }
  };

  const handleLanguageChange = async (newLocale: Locale) => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLocale }),
      });
      if (!res.ok) {
        console.error('Error updating language:', res.status);
        return;
      }

      // Update local state
      setCurrentLocale(newLocale);
      setLocale(newLocale);

      // Update profile state
      if (profile) {
        setProfile({ ...profile, language: newLocale });
      }

      // Reload page to apply language changes
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('account', currentLocale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {t('language', currentLocale)}
            </label>
            <Select
              value={currentLocale}
              onValueChange={(value) => handleLanguageChange(value as Locale)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logOut', currentLocale)}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('privacy', currentLocale)}
          </CardTitle>
          <CardDescription>
            {t('privacyDescription', currentLocale)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">{t('whatWeStore', currentLocale)}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('emailForAuth', currentLocale)}</li>
              <li>{t('yourAnswers', currentLocale)}</li>
              <li>{t('preferenceProfile', currentLocale)}</li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">{t('partnersSeeOnly', currentLocale)}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('matches', currentLocale)}</li>
              <li>{t('whatYouDontWant', currentLocale)}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('dangerZone', currentLocale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDeleteAccount}
            variant="destructive"
            className="w-full"
          >
            {t('deleteAccount', currentLocale)}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {t('deleteAccountWarning', currentLocale)}
          </p>
        </CardContent>
      </Card>

      {/* App info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Intimate Discovery v2.0</p>
        <p>Made with care</p>
      </div>
    </div>
  );
}
