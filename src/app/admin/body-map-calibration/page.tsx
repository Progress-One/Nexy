'use client';

import { useState } from 'react';
import { ZoneCalibrationTool } from '@/components/discovery/BodyMapAnswer/ZoneCalibrationTool';
import type { BodyGender, BodyView } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function BodyMapCalibrationPage() {
  const [gender, setGender] = useState<BodyGender>('male');
  const [view, setView] = useState<BodyView>('front');

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Калибровка зон Body Map</h1>
        <p className="text-muted-foreground">
          Инструмент для настройки границ зон на теле. Выберите пол и вид, затем откалибруйте зоны.
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Настройки</h2>
        <p className="text-sm text-muted-foreground mb-4">Выберите пол и вид тела для калибровки</p>
        <div className="flex gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Пол:</label>
            <div className="flex gap-2">
              <Button
                variant={gender === 'male' ? 'default' : 'outline'}
                onClick={() => setGender('male')}
              >
                Мужской
              </Button>
              <Button
                variant={gender === 'female' ? 'default' : 'outline'}
                onClick={() => setGender('female')}
              >
                Женский
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Вид:</label>
            <div className="flex gap-2">
              <Button
                variant={view === 'front' ? 'default' : 'outline'}
                onClick={() => setView('front')}
              >
                Спереди
              </Button>
              <Button
                variant={view === 'back' ? 'default' : 'outline'}
                onClick={() => setView('back')}
              >
                Сзади
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ZoneCalibrationTool
          gender={gender}
          view={view}
          locale="ru"
          onSave={(zones) => {
            console.log('Saved zones:', zones);
          }}
        />
      </div>

      <div className="bg-card border rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Инструкция</h2>
        <div className="space-y-2 text-sm">
          <p><strong>1. Выберите зону</strong> в списке слева</p>
          <p><strong>2. Перетащите зону</strong> за центр для перемещения</p>
          <p><strong>3. Перетащите края</strong> (верх, низ, лево, право) для изменения размера</p>
          <p><strong>4. Перетащите углы</strong> для точной настройки</p>
          <p><strong>5. Нажмите &quot;Сохранить&quot;</strong> — код скопируется в буфер обмена</p>
          <p className="text-muted-foreground mt-4">
            Скопированный код можно вставить в <code className="bg-muted px-1 py-0.5 rounded">zone-detection.ts</code> в соответствующий массив зон.
          </p>
        </div>
      </div>
    </div>
  );
}
