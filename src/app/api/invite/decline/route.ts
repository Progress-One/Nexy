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

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('partnerships')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Cannot decline own invite
    if (invite.inviter_id === user.id) {
      return NextResponse.json({ error: 'Cannot decline own invite' }, { status: 400 });
    }

    // Update status to declined
    const { error: updateError } = await supabase
      .from('partnerships')
      .update({
        status: 'declined',
        partner_id: user.id,
      })
      .eq('id', invite.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to decline' }, { status: 500 });
    }

    // Create notification for inviter (use service client for RLS bypass)
    const serviceSupabase = await createServiceClient();
    await serviceSupabase.from('notifications').insert({
      user_id: invite.inviter_id,
      type: 'invite_declined',
      title: 'Приглашение отклонено',
      message: 'Ваше приглашение было отклонено',
      data: { partnership_id: invite.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Decline invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
