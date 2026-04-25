'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Crown } from 'lucide-react';

const dimensions = [
  { id: 'bondage', label: 'Бондаж', emoji: '🔗' },
  { id: 'blindfold', label: 'Повязка на глаза', emoji: '🙈' },
  { id: 'dominance', label: 'Доминирование', emoji: '👑' },
  { id: 'submission', label: 'Подчинение', emoji: '🦋' },
  { id: 'spanking', label: 'Шлепки', emoji: '🖐️' },
  { id: 'roleplay', label: 'Ролевые игры', emoji: '🎭' },
  { id: 'exhibition', label: 'Эксгибиционизм', emoji: '👀' },
  { id: 'sensory', label: 'Сенсорная игра', emoji: '✨' },
];

export default function ProposePage({ params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = use(params);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium] = useState(false); // TODO: Check actual subscription
  const router = useRouter();

  const handlePropose = async () => {
    if (!selectedDimension || !isPremium) return;

    setLoading(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnership_id: partnerId,
          dimension: selectedDimension,
        }),
      });
      if (!res.ok) {
        console.error('proposal creation failed', res.status);
      }

      router.push(`/partners/${partnerId}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Предложить вопрос</CardTitle>
          <CardDescription>
            Выберите тему, которую хотите исследовать с партнёром.
            Партнёр получит вопрос на эту тему, не зная что вы его предложили.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPremium ? (
            <div className="text-center py-6">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Функция Premium</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Предложения доступны только для Premium пользователей
              </p>
              <Button asChild>
                <a href="/premium">
                  <Crown className="w-4 h-4 mr-2" />
                  Получить Premium
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {dimensions.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={() => setSelectedDimension(dim.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedDimension === dim.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{dim.emoji}</span>
                    <span className="text-sm font-medium">{dim.label}</span>
                  </button>
                ))}
              </div>

              <Button
                onClick={handlePropose}
                disabled={!selectedDimension || loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Отправить предложение
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Badge variant="secondary" className="mb-2">Как это работает</Badge>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>1. Вы выбираете тему для исследования</li>
            <li>2. Партнёр получает вопрос на эту тему</li>
            <li>3. Если партнёр ответит положительно — вы увидите совпадение</li>
            <li>4. Если нет — вы никогда не узнаете об этом</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
