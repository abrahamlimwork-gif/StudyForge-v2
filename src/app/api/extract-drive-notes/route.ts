import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { fileId, accessToken } = await req.json();

    if (!fileId || !accessToken) {
      return NextResponse.json({ error: 'Missing fileId or accessToken' }, { status: 400 });
    }

    // 1. Metadata Priority: Fetch actual slide count from Google Slides API
    let actualSlideCount = 0;
    try {
      const slidesMetaRes = await fetch(`https://slides.googleapis.com/v1/presentations/${fileId}?fields=slides.objectId`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (slidesMetaRes.ok) {
        const meta = await slidesMetaRes.json();
        actualSlideCount = meta.slides?.length || 0;
      }
    } catch (e) {
      console.warn('[extract-drive-notes] Failed to fetch Slides metadata:', e);
    }

    // 2. Drive Export: Export to text/plain
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[extract-drive-notes] Export failed:', response.status, errorText);
      return NextResponse.json({ error: `Drive Export Failed: ${response.status}`, details: errorText }, { status: response.status });
    }

    const rawText = await response.text();
    const slideBlocks = rawText.split('\f').filter((b: string) => b.trim().length > 0 || b.includes('\n'));
    
    // 3. Array Padding Logic: Ensure length matches actualSlideCount
    const finalNotes = new Array(actualSlideCount || slideBlocks.length).fill("(No speaker notes for this slide)");

    slideBlocks.forEach((block: string, index: number) => {
      if (index < finalNotes.length) {
        const parts = block.split(/\n\s*\n/); 
        const noteText = parts.length > 1 ? parts[parts.length - 1].trim() : "";
        if (noteText) {
          finalNotes[index] = noteText;
        }
      }
    });

    return NextResponse.json({ 
      notes: finalNotes,
      slideCount: finalNotes.length 
    });

  } catch (err: any) {
    console.error('[extract-drive-notes] Server error:', err);
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
  }
}
