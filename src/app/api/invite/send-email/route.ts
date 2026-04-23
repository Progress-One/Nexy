import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { InviteEmail, getInviteEmailSubject } from '@/lib/email-templates/invite';

interface InviteRow {
  id: string;
  invite_code: string;
  inviter_id: string;
  status: string;
  expires_at: Date | null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
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

    // Raw query: partnerships.expires_at / partner_email aren't in generated schema yet
    const pool = getDbPool();
    const inviteRes = await pool.query<InviteRow>(
      `SELECT id, invite_code, inviter_id, status, expires_at
       FROM partnerships
       WHERE invite_code = $1 AND inviter_id = $2 AND status = 'pending'
       LIMIT 1`,
      [inviteCode, user.id]
    );
    const invite = inviteRes.rows[0];

    if (!invite) {
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

    // Save partner email (raw query)
    await pool.query(
      'UPDATE partnerships SET partner_email = $1 WHERE id = $2',
      [email, invite.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send invite email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
