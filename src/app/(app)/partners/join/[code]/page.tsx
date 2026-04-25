'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'joining' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function validateInvite() {
      try {
        const res = await fetch(`/api/partners/join/${code}`);
        if (res.status === 401) {
          router.push(`/login?next=/partners/join/${code}`);
          return;
        }
        if (!res.ok) {
          setStatus('invalid');
          setError('Приглашение не найдено или уже использовано');
          return;
        }
        const json = (await res.json()) as { valid?: boolean; reason?: string };
        if (!json.valid) {
          setStatus('invalid');
          if (json.reason === 'self') setError('Нельзя принять своё собственное приглашение');
          else if (json.reason === 'already_partners') setError('Вы уже партнёры');
          else setError('Приглашение не найдено или уже использовано');
          return;
        }
        setStatus('valid');
      } catch {
        setStatus('invalid');
        setError('Произошла ошибка');
      }
    }

    validateInvite();
  }, [code, router]);

  const handleJoin = async () => {
    setStatus('joining');
    try {
      const res = await fetch(`/api/partners/join/${code}/accept`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Не удалось принять приглашение');
        setStatus('invalid');
        return;
      }

      setStatus('success');
      setTimeout(() => {
        router.push('/partners');
      }, 1500);
    } catch {
      setError('Произошла ошибка');
      setStatus('invalid');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="text-center">
          {status === 'valid' && (
            <>
              <UserCheck className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle>Приглашение</CardTitle>
              <CardDescription>
                Вас приглашают стать партнёром в Intimate Discovery
              </CardDescription>
            </>
          )}

          {status === 'invalid' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
              <CardTitle>Ошибка</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}

          {status === 'joining' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-2" />
              <CardTitle>Подключение...</CardTitle>
            </>
          )}

          {status === 'success' && (
            <>
              <UserCheck className="w-12 h-12 mx-auto text-green-500 mb-2" />
              <CardTitle>Успешно!</CardTitle>
              <CardDescription>
                Вы теперь партнёры. Перенаправление...
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {status === 'valid' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                После принятия приглашения вы сможете видеть совпадения
                в ваших предпочтениях. Ваши данные останутся приватными —
                показываются только общие интересы.
              </p>
              <Button onClick={handleJoin} className="w-full">
                Принять приглашение
              </Button>
            </div>
          )}

          {status === 'invalid' && (
            <Button
              onClick={() => router.push('/partners')}
              variant="outline"
              className="w-full"
            >
              Вернуться к партнёрам
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
