import { NextRequest, NextResponse } from 'next/server';
import { updatePsychologicalProfile } from '@/lib/profile-signals';
import { getCurrentUser } from '@/lib/auth';
import type { SceneV2, SignalUpdate } from '@/lib/types';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { signalUpdates, testScoreUpdates, scene } = body as {
    signalUpdates: SignalUpdate[];
    testScoreUpdates: Record<string, number>;
    scene: SceneV2;
  };
  await updatePsychologicalProfile(user.id, signalUpdates, testScoreUpdates, scene);
  return NextResponse.json({ ok: true });
}
