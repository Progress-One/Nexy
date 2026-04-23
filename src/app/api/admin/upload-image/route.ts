import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToStorage, getStoragePublicUrl } from '@/lib/storage';
import type { Json } from '@/lib/db/schema';

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sceneId = formData.get('sceneId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sceneId) {
      return NextResponse.json({ error: 'No sceneId provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine content type
    const contentType = file.type || 'image/webp';
    const extension = contentType.split('/')[1] || 'webp';
    const fileName = `${sceneId}_${Date.now()}.${extension}`;

    console.log('[UploadImage] Uploading:', {
      sceneId,
      fileName,
      contentType,
      size: buffer.byteLength,
    });

    try {
      await uploadToStorage('scenes', fileName, buffer, { contentType });
    } catch (uploadError) {
      console.error('[UploadImage] Upload error:', uploadError);
      return NextResponse.json({ error: (uploadError as Error).message }, { status: 500 });
    }

    const imageUrl = getStoragePublicUrl('scenes', fileName);

    // Get current scene data
    let scene;
    try {
      scene = await db
        .selectFrom('scenes')
        .select(['image_variants', 'generation_prompt'])
        .where('id', '=', sceneId)
        .executeTakeFirst();
    } catch (selectError) {
      console.error('[UploadImage] Select error:', selectError);
      return NextResponse.json({ error: (selectError as Error).message }, { status: 500 });
    }

    // Add to image_variants (check for duplicates without query params)
    const currentVariants: ImageVariant[] = (scene?.image_variants as ImageVariant[]) || [];
    const getBaseUrl = (url: string) => url.split('?')[0];
    const baseImageUrl = getBaseUrl(imageUrl);

    // Skip if already exists
    if (currentVariants.some(v => getBaseUrl(v.url) === baseImageUrl)) {
      return NextResponse.json({
        success: true,
        imageUrl,
        variants: currentVariants,
        message: 'Image already in gallery',
      });
    }

    const newVariant: ImageVariant = {
      url: imageUrl,
      prompt: scene?.generation_prompt || 'Uploaded manually',
      created_at: new Date().toISOString(),
      qa_status: null,
    };
    const updatedVariants = [...currentVariants, newVariant];

    // Update scene: set as main image AND add to variants
    try {
      await db
        .updateTable('scenes')
        .set({
          image_url: imageUrl,
          image_variants: updatedVariants as unknown as Json,
        })
        .where('id', '=', sceneId)
        .execute();
    } catch (updateError) {
      console.error('[UploadImage] DB update error:', updateError);
      return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
    }

    console.log('[UploadImage] Success:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      variants: updatedVariants,
    });
  } catch (error) {
    console.error('[UploadImage] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
