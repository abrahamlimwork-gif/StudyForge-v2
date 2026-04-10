
/**
 * Utility functions for interacting with Google Drive and Slides APIs.
 * Includes enhanced logging for audit purposes.
 */

export async function fetchGoogleSlides(accessToken: string) {
  // Query only for presentations created by this app (drive.file) 
  // OR broad discovery if user authorized drive.metadata.readonly
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.presentation'");
  const fields = encodeURIComponent("files(id, name, modifiedTime, thumbnailLink)");
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;
  
  console.log("Fetching Drive API URL:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Drive API Error Response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });
    throw new Error(`Failed to fetch Google Slides: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  console.log("Drive API Success. Items found:", data.files?.length || 0);
  return data.files || [];
}

export async function createGoogleSlides(accessToken: string, title: string) {
  console.log("Creating new Google Slides presentation with title:", title);
  
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
    console.error("Slides API Create Error:", errorBody);
    throw new Error(`Failed to create Google Slides: ${response.status} - ${errorBody}`);
  }

  const presentation = await response.json();
  console.log("Presentation created successfully with ID:", presentation.presentationId);
  return presentation;
}

export async function addSlidesContent(accessToken: string, presentationId: string, slides: { title: string; content: string }[]) {
  console.log(`Adding ${slides.length} slides to presentation ${presentationId}`);
  
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
    console.error("Slides API Update Error:", errorBody);
    throw new Error(`Failed to update presentation content: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}
