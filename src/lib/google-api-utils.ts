
/**
 * Utility functions for interacting with Google Drive and Slides APIs.
 */

export async function fetchGoogleSlides(accessToken: string) {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.presentation' and trashed = false");
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
 * Fetches speaker notes for all slides in a presentation.
 */
export async function fetchSpeakerNotes(accessToken: string, presentationId: string) {
  const url = `https://slides.googleapis.com/v1/presentations/${presentationId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Slides API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  if (!data.slides) return [];
  
  return data.slides.map((slide: any) => {
    const notesPage = slide.notesPage;
    if (!notesPage) return "";
    
    const notesElement = notesPage.pageElements?.find((el: any) => el.shape?.shapeType === 'SPEAKER_NOTES');
    if (!notesElement || !notesElement.shape.text) return "";
    
    return notesElement.shape.text.textElements
      .map((te: any) => te.textRun?.content || "")
      .join("")
      .trim();
  });
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
