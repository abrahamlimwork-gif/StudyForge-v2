import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const accessToken = formData.get('accessToken') as string | null;
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string | null;
    const fileMime = (formData.get('fileMime') as string | null) ?? 'application/octet-stream';

    // --- Validation ---
    if (!accessToken) {
      console.error('[drive-upload] Missing accessToken');
      return NextResponse.json({ error: 'Missing accessToken. Link Google Drive first.' }, { status: 400 });
    }
    if (!file || !fileName) {
      console.error('[drive-upload] Missing file or fileName');
      return NextResponse.json({ error: 'Missing file or fileName.' }, { status: 400 });
    }

    // --- Metadata: PPTX/PPT convert to native Google Slides ---
    const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
    const metadata: Record<string, string> = { name: fileName };
    if (isPptx) {
      metadata.mimeType = 'application/vnd.google-apps.presentation';
    }

    // --- Build multipart/related body for Google Drive API ---
    const boundary = `studyforge_${Date.now()}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const base64File = fileBuffer.toString('base64');

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${fileMime}`,
      'Content-Transfer-Encoding: base64',
      '',
      base64File,
      `--${boundary}--`,
    ].join('\r\n');

    console.log(`[drive-upload] Uploading "${fileName}" (${fileBuffer.length} bytes, isPptx=${isPptx})`);

    // --- Upload to Google Drive ---
    const driveResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    const responseText = await driveResponse.text();

    if (!driveResponse.ok) {
      // Log the exact Google error server-side AND return it to the client
      console.error('[drive-upload] Google API error:', driveResponse.status, responseText);
      return NextResponse.json(
        {
          error: `Google Drive API returned ${driveResponse.status}`,
          detail: responseText,
        },
        { status: driveResponse.status }
      );
    }

    const uploadedFile = JSON.parse(responseText);
    console.log(`[drive-upload] ✅ Success! File ID: ${uploadedFile.id}, name: ${uploadedFile.name}`);

    // --- Extract Speaker Notes if PPTX ---
    let notes: string[] = [];
    if (isPptx) {
      try {
        const zip = await JSZip.loadAsync(fileBuffer);
        const slideKeys = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0]);
            const numB = parseInt(b.match(/\d+/)![0]);
            return numA - numB;
          });

        for (const key of slideKeys) {
          const slideNumber = key.match(/slide(\d+)\.xml/)![1];
          const notesKey = `ppt/notesSlides/notesSlide${slideNumber}.xml`;

          if (zip.files[notesKey]) {
            const notesXml = await zip.files[notesKey].async('text');
            const textMatches = notesXml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
            const noteText = textMatches
              .map(match => match.replace(/<\/?a:t>/g, '').trim())
              .filter(text => text.length > 0 && !/^\d+$/.test(text))
              .join(' ')
              .trim();
            notes.push(noteText || '');
          } else {
            notes.push('');
          }
        }
      } catch (extractErr) {
        console.error('[drive-upload] Failed to extract PPTX notes:', extractErr);
      }
    }

    // Return the Google File ID, name, and the extracted notes so the client can swap Local → Cloud and save to Firestore
    return NextResponse.json({
      id: uploadedFile.id,
      name: uploadedFile.name,
      mimeType: uploadedFile.mimeType,
      webViewLink: uploadedFile.webViewLink,
      notes: notes,
    });

  } catch (err: any) {
    console.error('[drive-upload] Unexpected server error:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown server error' }, { status: 500 });
  }
}
