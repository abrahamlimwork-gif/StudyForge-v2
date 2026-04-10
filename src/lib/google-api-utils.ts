
/**
 * Utility functions for interacting with Google Drive and Slides APIs.
 */

export async function fetchGoogleSlides(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.presentation"&fields=files(id, name, modifiedTime, thumbnailLink)',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch Google Slides');
  const data = await response.json();
  return data.files || [];
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
  if (!response.ok) throw new Error('Failed to create Google Slides');
  return await response.json();
}

export async function addSlidesContent(accessToken: string, presentationId: string, slides: { title: string; content: string }[]) {
  const requests = slides.flatMap((slide, index) => {
    const slideId = `slide_${index}`;
    return [
      {
        createSlide: {
          objectId: slideId,
          insertionIndex: index,
          slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
        },
      },
      {
        insertText: {
          objectId: `${slideId}_title`, // Assuming standard IDs from layout
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

  if (!response.ok) throw new Error('Failed to update presentation content');
  return await response.json();
}
