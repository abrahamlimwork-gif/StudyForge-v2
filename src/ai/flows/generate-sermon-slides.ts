
'use server';
/**
 * @fileOverview A Genkit flow to generate structured sermon slides.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSermonSlidesInputSchema = z.object({
  topic: z.string().describe('The main theme or topic of the sermon.'),
  scripture: z.string().optional().describe('Key scripture reference.'),
});

const GenerateSermonSlidesOutputSchema = z.object({
  title: z.string(),
  slides: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
});

const prompt = ai.definePrompt({
  name: 'generateSermonSlidesPrompt',
  input: { schema: GenerateSermonSlidesInputSchema },
  output: { schema: GenerateSermonSlidesOutputSchema },
  prompt: `You are an AI sermon assistant. Generate a professional outline for a church presentation.
  
  Topic: {{{topic}}}
  Scripture: {{{scripture}}}
  
  Provide a catchy title and at least 5 slides:
  1. Title Slide
  2. Opening Scripture
  3. Key Point 1
  4. Key Point 2
  5. Application/Closing
  
  Each slide should have a clear title and concise bullet points for the body.`,
});

export async function generateSermonSlides(input: z.infer<typeof GenerateSermonSlidesInputSchema>) {
  const { output } = await prompt(input);
  return output!;
}
