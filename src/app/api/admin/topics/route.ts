import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

const TOPICS_PATH = path.join(process.cwd(), 'scenes/v2/topics.json');

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const content = await readFile(TOPICS_PATH, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading topics.json:', error);
    return NextResponse.json({ error: 'Failed to read topics' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = await request.json();

    // Validate structure
    if (!data.topics || !Array.isArray(data.topics)) {
      return NextResponse.json({ error: 'Invalid topics structure' }, { status: 400 });
    }

    // Write back to file
    await writeFile(TOPICS_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing topics.json:', error);
    return NextResponse.json({ error: 'Failed to save topics' }, { status: 500 });
  }
}
