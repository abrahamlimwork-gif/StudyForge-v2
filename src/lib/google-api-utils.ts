/**
 * Utility functions for interacting with Google Drive and Slides APIs.
 */

export async function fetchGoogleSlides(accessToken: string) {
  const query = encodeURIComponent("(mimeType='application/vnd.google-apps.presentation' or mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation') and trashed = false");
  const fields = encodeURIComponent("files(id, name, modifiedTime)");
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error: any = new Error(`Google API Error: ${response.status}`);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Uploads a local file to Google Drive via the /api/drive-upload server proxy.
 * Returns the Google File object { id, name, mimeType, webViewLink } on success.
 * Logs the exact Google API error to the browser console on failure.
 */
export async function uploadFileToDrive(accessToken: string, file: File): Promise<{ id: string; name: string; mimeType: string; webViewLink?: string; notes?: string[] }> {
  const form = new FormData();
  form.append('accessToken', accessToken);
  form.append('file', file, file.name);
  form.append('fileName', file.name);
  form.append('fileMime', file.type || 'application/octet-stream');

  const response = await fetch('/api/drive-upload', {
    method: 'POST',
    body: form,
  });

  const data = await response.json().catch(() => ({ error: response.statusText }));

  if (!response.ok) {
    // Surface the exact Google error to the browser console
    console.error('[StudyForge] Drive Upload Failed:', {
      status: response.status,
      error: data.error,
      googleDetail: data.detail,
    });
    throw new Error(data.detail ? `${data.error}\n\nGoogle said: ${data.detail}` : data.error ?? 'Upload failed');
  }

  return data;
}


export async function createGoogleSlides(accessToken: string, title: string) {
  const response = await fetch('https://www.googleapis.com/slides/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Google Slides: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

export async function addSlidesContent(accessToken: string, presentationId: string, slides: { title: string; content: string }[]) {
  const requests = slides.flatMap((slide, index) => {
    const slideId = `slide_${index + 1}`;
    return [
      {
        createSlide: {
          objectId: slideId,
          insertionIndex: index + 1,
          slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
        },
      },
      {
        insertText: {
          objectId: `${slideId}_title`,
          text: slide.title,
        },
      },
      {
        insertText: {
          objectId: `${slideId}_body`,
          text: slide.content,
        },
      },
    ];
  });

  const response = await fetch(`https://www.googleapis.com/slides/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update presentation content: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}
