import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { InviteEmail, getInviteEmailSubject } from '@/lib/email-templates/invite';

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

    const { email, inviteCode, locale = 'ru' } = await request.json();

    if (!email || !inviteCode) {
      return NextResponse.json({ error: 'Email and invite code required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check that invite exists and belongs to user
    const { data: invite, error: inviteError } = await supabase
      .from('partnerships')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('inviter_id', user.id)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/partners/join/${inviteCode}`;
    const expiresAt = invite.expires_at
      ? new Date(invite.expires_at)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Send email
    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: getInviteEmailSubject(locale as 'ru' | 'en'),
      react: InviteEmail({
        inviteCode,
        inviteUrl,
        expiresAt,
        locale: locale as 'ru' | 'en',
      }),
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Save partner email
    await supabase.from('partnerships').update({ partner_email: email }).eq('id', invite.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send invite email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
