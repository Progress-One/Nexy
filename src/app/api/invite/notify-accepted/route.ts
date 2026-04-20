import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviterId, partnershipId } = await request.json();

    if (!inviterId) {
      return NextResponse.json({ error: 'Inviter ID required' }, { status: 400 });
    }

    // Create notification (use service client for RLS bypass on insert)
    const serviceSupabase = await createServiceClient();

    const { error: notifyError } = await serviceSupabase.from('notifications').insert({
      user_id: inviterId,
      type: 'invite_accepted',
      title: 'Приглашение принято!',
      message: 'Ваш партнёр присоединился к Nexy',
      data: { partnership_id: partnershipId, partner_id: user.id },
    });

    if (notifyError) {
      console.error('Notification insert error:', notifyError);
      // Don't fail the request - notification is not critical
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notify accepted error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
