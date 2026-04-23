import { NextRequest, NextResponse } from 'next/server';
import { updateTagPreferencesFromSwipe } from '@/lib/tag-preferences';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { sceneTags, sceneSlug, responseValue, experienceLevel } = body as {
    sceneTags: string[];
    sceneSlug: string;
    responseValue: number;
    experienceLevel?: number | null;
  };
  await updateTagPreferencesFromSwipe(user.id, sceneTags, sceneSlug, responseValue, experienceLevel);
  return NextResponse.json({ ok: true });
}
