import { NextResponse } from 'next/server';
import { fetchUserGates } from '@/lib/onboarding-gates';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const gates = await fetchUserGates(user.id);
  return NextResponse.json({ gates });
}
