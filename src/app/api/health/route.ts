import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'nexy-web',
    uptime_sec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
