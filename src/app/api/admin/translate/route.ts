import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
  }

  const { text, targetLang = 'en' } = await req.json();

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Translate the following text to ${targetLang === 'en' ? 'English' : 'Russian'}. Return ONLY the translation, nothing else. Keep the same tone and style.

Text to translate:
${text}`,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const textContent = result.content.find((c: { type: string }) => c.type === 'text');

    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    return NextResponse.json({ translation: textContent.text.trim() });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
