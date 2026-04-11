import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

/**
 * Extracts speaker notes from an uploaded .pptx file.
 * PPTX files are ZIP archives containing XML slide data.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // PPTX stores slides in ppt/slides/slide1.xml, slide2.xml, etc.
    const slideKeys = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)![0]);
        const numB = parseInt(b.match(/\d+/)![0]);
        return numA - numB;
      });

    const notes: string[] = [];

    for (const key of slideKeys) {
      const xmlContent = await zip.files[key].async('text');

      // Speaker notes live in <p:notes> or the corresponding notesSlide XML
      // The slide XML has a <p:sp> with <p:ph type="body"> inside <p:notes>
      // More reliably: parse the notesSlide file for this slide index
      const slideNumber = key.match(/slide(\d+)\.xml/)![1];
      const notesKey = `ppt/notesSlides/notesSlide${slideNumber}.xml`;

      if (zip.files[notesKey]) {
        const notesXml = await zip.files[notesKey].async('text');
        // Extract text runs from <a:t> tags, skipping slide number placeholders
        const textMatches = notesXml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
        const noteText = textMatches
          .map(match => match.replace(/<\/?a:t>/g, '').trim())
          .filter(text => text.length > 0 && !/^\d+$/.test(text)) // skip lone slide numbers
          .join(' ')
          .trim();
        notes.push(noteText || '');
      } else {
        notes.push('');
      }
    }

    return NextResponse.json({ notes });
  } catch (err: any) {
    console.error('[extract-notes] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
