'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BodyView, BodyGender, Locale } from '@/lib/types';
import { ZONE_REGIONS } from './zone-detection';
import { Button } from '@/components/ui/button';

interface ZoneCalibrationToolProps {
  gender: BodyGender;
  view: BodyView;
  locale?: Locale;
  onSave?: (zones: typeof ZONE_REGIONS[`${BodyGender}-${BodyView}`]) => void;
}

export function ZoneCalibrationTool({
  gender,
  view,
  locale = 'ru',
  onSave,
}: ZoneCalibrationToolProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [zones, setZones] = useState(() => {
    const key = `${gender}-${view}` as const;
    return [...(ZONE_REGIONS[key] || [])];
  });
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);
  const [hoveredZoneIndex, setHoveredZoneIndex] = useState<number | null>(null);
  const [draggingZone, setDraggingZone] = useState<{ index: number; type: 'move' | 'resize'; corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right'; startX?: number; startY?: number; startBounds?: any } | null>(null);

  // Update zones when gender or view changes
  useEffect(() => {
    const key = `${gender}-${view}` as const;
    const newZones = [...(ZONE_REGIONS[key] || [])];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state reset on prop change
    setZones(newZones);
    setSelectedZoneIndex(null);
    setHoveredZoneIndex(null);
    setDraggingZone(null);
  }, [gender, view]);

  const getPositionFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageRef.current) return null;

      const rect = imageRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    },
    []
  );

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!draggingZone) return;

      const pos = getPositionFromEvent(e.clientX, e.clientY);
      if (!pos) return;

      setZones((prev) => {
        const next = [...prev];
        const zone = next[draggingZone.index];
        const updated = { ...zone };

        if (draggingZone.type === 'move' && draggingZone.startX !== undefined && draggingZone.startY !== undefined && draggingZone.startBounds) {
          // Move entire zone
          const deltaX = pos.x - draggingZone.startX;
          const deltaY = pos.y - draggingZone.startY;
          updated.bounds = {
            x1: Math.max(0, Math.min(100, draggingZone.startBounds.x1 + deltaX)),
            y1: Math.max(0, Math.min(100, draggingZone.startBounds.y1 + deltaY)),
            x2: Math.max(0, Math.min(100, draggingZone.startBounds.x2 + deltaX)),
            y2: Math.max(0, Math.min(100, draggingZone.startBounds.y2 + deltaY)),
          };
        } else if (draggingZone.type === 'resize' && draggingZone.startBounds) {
          // Resize from edge or corner
          const deltaX = pos.x - (draggingZone.startX || 0);
          const deltaY = pos.y - (draggingZone.startY || 0);
          
          if (draggingZone.corner === 'top-left') {
            updated.bounds = {
              ...updated.bounds,
              x1: Math.max(0, Math.min(updated.bounds.x2 - 1, draggingZone.startBounds.x1 + deltaX)),
              y1: Math.max(0, Math.min(updated.bounds.y2 - 1, draggingZone.startBounds.y1 + deltaY)),
            };
          } else if (draggingZone.corner === 'top-right') {
            updated.bounds = {
              ...updated.bounds,
              x2: Math.min(100, Math.max(updated.bounds.x1 + 1, draggingZone.startBounds.x2 + deltaX)),
              y1: Math.max(0, Math.min(updated.bounds.y2 - 1, draggingZone.startBounds.y1 + deltaY)),
            };
          } else if (draggingZone.corner === 'bottom-left') {
            updated.bounds = {
              ...updated.bounds,
              x1: Math.max(0, Math.min(updated.bounds.x2 - 1, draggingZone.startBounds.x1 + deltaX)),
              y2: Math.min(100, Math.max(updated.bounds.y1 + 1, draggingZone.startBounds.y2 + deltaY)),
            };
          } else if (draggingZone.corner === 'bottom-right') {
            updated.bounds = {
              ...updated.bounds,
              x2: Math.min(100, Math.max(updated.bounds.x1 + 1, draggingZone.startBounds.x2 + deltaX)),
              y2: Math.min(100, Math.max(updated.bounds.y1 + 1, draggingZone.startBounds.y2 + deltaY)),
            };
          } else if (draggingZone.corner === 'top') updated.bounds = { ...updated.bounds, y1: Math.max(0, Math.min(updated.bounds.y2 - 1, pos.y)) };
          else if (draggingZone.corner === 'bottom') updated.bounds = { ...updated.bounds, y2: Math.min(100, Math.max(updated.bounds.y1 + 1, pos.y)) };
          else if (draggingZone.corner === 'left') updated.bounds = { ...updated.bounds, x1: Math.max(0, Math.min(updated.bounds.x2 - 1, pos.x)) };
          else if (draggingZone.corner === 'right') updated.bounds = { ...updated.bounds, x2: Math.min(100, Math.max(updated.bounds.x1 + 1, pos.x)) };
        }

        next[draggingZone.index] = updated;
        return next;
      });
    },
    [draggingZone, getPositionFromEvent]
  );

  const handleImageMouseUp = useCallback(() => {
    setDraggingZone(null);
  }, []);

  const handleZoneDrag = useCallback(
    (index: number, corner: 'x1' | 'y1' | 'x2' | 'y2', e: React.MouseEvent) => {
      e.stopPropagation();
      const pos = getPositionFromEvent(e.clientX, e.clientY);
      if (!pos) return;

      setZones((prev) => {
        const next = [...prev];
        const updated = { ...next[index] };
        
        if (corner === 'x1') updated.bounds = { ...updated.bounds, x1: pos.x };
        else if (corner === 'y1') updated.bounds = { ...updated.bounds, y1: pos.y };
        else if (corner === 'x2') updated.bounds = { ...updated.bounds, x2: pos.x };
        else if (corner === 'y2') updated.bounds = { ...updated.bounds, y2: pos.y };

        next[index] = updated;
        return next;
      });
    },
    [getPositionFromEvent]
  );

  const imageKey = `${gender}-${view}` as const;
  const imageSrc =
    gender === 'male' && view === 'front' ? '/images/dolls/man_front.jpg' :
    gender === 'male' && view === 'back' ? '/images/dolls/man_back.jpg' :
    gender === 'female' && view === 'front' ? '/images/dolls/woman_front.jpeg' :
    '/images/dolls/woman_back.jpeg';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {locale === 'ru' ? 'Калибровка зон' : 'Zone Calibration'}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const key = `${gender}-${view}` as const;
              setZones([...(ZONE_REGIONS[key] || [])]);
            }}
          >
            {locale === 'ru' ? 'Сбросить' : 'Reset'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const key = `${gender}-${view}` as const;
              if (onSave) {
                onSave(zones as typeof ZONE_REGIONS[typeof key]);
              }
              // Copy to clipboard for easy use in code
              const code = `'${key}': [\n${zones.map(z => 
                `    { name: { ru: '${z.name.ru}', en: '${z.name.en}' }, bounds: { x1: ${z.bounds.x1}, y1: ${z.bounds.y1}, x2: ${z.bounds.x2}, y2: ${z.bounds.y2} } }`
              ).join(',\n')}\n  ],`;
              navigator.clipboard.writeText(code);
              const message = locale === 'ru' 
                ? `Скопировано в буфер обмена!\n\nКод для вставки в zone-detection.ts:\n\n${code.substring(0, 200)}...`
                : `Copied to clipboard!\n\nCode to paste into zone-detection.ts:\n\n${code.substring(0, 200)}...`;
              alert(message);
            }}
          >
            {locale === 'ru' ? 'Сохранить' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {locale === 'ru' 
          ? 'Выберите зону слева. Перетащите зону для перемещения, края для изменения размера, углы для точной настройки.'
          : 'Select a zone on the left. Drag the zone to move, edges to resize, corners for precise adjustment.'}
      </div>

      <div className="flex gap-4">
        {/* Zone list */}
        <div className="w-64 space-y-2 max-h-[600px] overflow-y-auto">
          {zones.map((zone, index) => (
            <div
              key={index}
              onClick={() => setSelectedZoneIndex(index)}
              onMouseEnter={() => setHoveredZoneIndex(index)}
              onMouseLeave={() => setHoveredZoneIndex(null)}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                selectedZoneIndex === index
                  ? 'bg-primary text-primary-foreground border-primary'
                  : hoveredZoneIndex === index
                  ? 'bg-muted'
                  : 'bg-background'
              }`}
            >
              <div className="font-medium text-sm">
                {zone.name[locale]}
              </div>
              <div className="text-xs opacity-75 mt-1">
                ({zone.bounds.x1.toFixed(1)}, {zone.bounds.y1.toFixed(1)}) - ({zone.bounds.x2.toFixed(1)}, {zone.bounds.y2.toFixed(1)})
              </div>
            </div>
          ))}
        </div>

        {/* Image with zone overlays */}
        <div className="flex-1 relative">
          <div
            ref={imageRef}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
            className="relative w-full max-w-[500px]"
          >
            <img
              src={imageSrc}
              alt={`${gender} ${view}`}
              className="w-full h-auto pointer-events-none select-none"
              draggable={false}
            />

            {/* Zone overlays */}
            <div className="absolute inset-0">
              {zones
                .map((zone, index) => {
                  const { x1, y1, x2, y2 } = zone.bounds;
                  const area = (x2 - x1) * (y2 - y1);
                  return { zone, index, area };
                })
                .sort((a, b) => b.area - a.area) // Большие зоны первыми (будут снизу)
                .map(({ zone, index }) => {
                  const { x1, y1, x2, y2 } = zone.bounds;
                  const isSelected = selectedZoneIndex === index;
                  const isHovered = hoveredZoneIndex === index;
                  const area = (x2 - x1) * (y2 - y1);
                  // Маленькие зоны выше (больший z-index), большие ниже
                  // z-index: выбранная > hovered > маленькие зоны > большие зоны
                  const baseZIndex = isSelected ? 1000 : isHovered ? 500 : Math.max(10, 1000 - Math.floor(area));
                  const zIndex = baseZIndex;

                  return (
                    <div
                      key={index}
                      className="absolute"
                      style={{
                        left: `${x1}%`,
                        top: `${y1}%`,
                        width: `${x2 - x1}%`,
                        height: `${y2 - y1}%`,
                        border: `2px solid ${isSelected ? '#3b82f6' : isHovered ? '#10b981' : 'rgba(128, 128, 128, 0.4)'}`,
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : isHovered ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        pointerEvents: isSelected ? 'auto' : 'none',
                        cursor: isSelected ? 'move' : 'default',
                        zIndex: zIndex,
                      }}
                    onMouseDown={(e) => {
                      if (isSelected && !draggingZone) {
                        const pos = getPositionFromEvent(e.clientX, e.clientY);
                        if (pos) {
                          setDraggingZone({
                            index,
                            type: 'move',
                            startX: pos.x,
                            startY: pos.y,
                            startBounds: { ...zone.bounds },
                          });
                        }
                      }
                    }}
                  >
                    {/* Corner handles */}
                    {isSelected && (
                      <>
                        {/* Top edge */}
                        <div
                          className="absolute h-2 -top-1 left-0 right-0 cursor-ns-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'top', startY: pos.y });
                            }
                          }}
                        />
                        {/* Bottom edge */}
                        <div
                          className="absolute h-2 -bottom-1 left-0 right-0 cursor-ns-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'bottom', startY: pos.y });
                            }
                          }}
                        />
                        {/* Left edge */}
                        <div
                          className="absolute w-2 -left-1 top-0 bottom-0 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'left', startX: pos.x });
                            }
                          }}
                        />
                        {/* Right edge */}
                        <div
                          className="absolute w-2 -right-1 top-0 bottom-0 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'right', startX: pos.x });
                            }
                          }}
                        />
                        {/* Top-left corner */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize -top-2 -left-2 z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'top-left', startX: pos.x, startY: pos.y, startBounds: { ...zone.bounds } });
                            }
                          }}
                        />
                        {/* Top-right corner */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize -top-2 -right-2 z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'top-right', startX: pos.x, startY: pos.y, startBounds: { ...zone.bounds } });
                            }
                          }}
                        />
                        {/* Bottom-left corner */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize -bottom-2 -left-2 z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'bottom-left', startX: pos.x, startY: pos.y, startBounds: { ...zone.bounds } });
                            }
                          }}
                        />
                        {/* Bottom-right corner */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize -bottom-2 -right-2 z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const pos = getPositionFromEvent(e.clientX, e.clientY);
                            if (pos) {
                              setDraggingZone({ index, type: 'resize', corner: 'bottom-right', startX: pos.x, startY: pos.y, startBounds: { ...zone.bounds } });
                            }
                          }}
                        />
                      </>
                    )}

                    {/* Zone label */}
                    <div
                      className="absolute top-0 left-0 bg-black/70 text-white text-xs px-1 rounded pointer-events-auto"
                      style={{ fontSize: '10px' }}
                    >
                      {zone.name[locale]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
