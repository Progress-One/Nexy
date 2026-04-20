'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Star } from 'lucide-react';

interface PartnerCardProps {
  id: string;
  partnerId: string;
  nickname?: string | null;
  status: string;
  matchCount?: number;
  hiddenCount?: number;
  index: number;
}

export function PartnerCard({
  id,
  partnerId,
  nickname,
  status,
  matchCount = 0,
  hiddenCount = 0,
  index,
}: PartnerCardProps) {
  const displayName = nickname || `Partner ${partnerId.slice(0, 4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/partners/${id}`}>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 className="font-medium">{displayName}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge
                  variant={status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {status === 'active' ? 'Активно' : 'Ожидание'}
                </Badge>
                {matchCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {matchCount} совпадений
                  </Badge>
                )}
                {hiddenCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                  >
                    <Star className="w-3 h-3 mr-0.5" />
                    {hiddenCount} скрытых
                  </Badge>
                )}
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
