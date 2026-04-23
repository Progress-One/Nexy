import { NextRequest, NextResponse } from 'next/server';
import { processBodyMapToGatesAndTags } from '@/lib/body-map-processing';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { bodyMapAnswer, sceneSlug } = body as {
    bodyMapAnswer: Parameters<typeof processBodyMapToGatesAndTags>[1];
    sceneSlug: string;
  };
  const result = await processBodyMapToGatesAndTags(user.id, bodyMapAnswer, sceneSlug);
  return NextResponse.json(result);
}
