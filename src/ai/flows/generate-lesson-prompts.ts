'use server';
/**
 * @fileOverview A Genkit flow to generate thought-provoking discussion prompts for lessons.
 *
 * - generateLessonPrompts - A function that handles the generation of lesson prompts.
 * - GenerateLessonPromptsInput - The input type for the generateLessonPrompts function.
 * - GenerateLessonPromptsOutput - The return type for the generateLessonPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonPromptsInputSchema = z
  .object({
    topic: z
      .string()
      .optional()
      .describe('The topic for which to generate discussion prompts.'),
    scriptureReference: z
      .string()
      .optional()
      .describe(
        'A scripture reference (e.g., John 3:16) for which to generate discussion prompts.'
      ),
  })
  .refine(data => data.topic || data.scriptureReference, {
    message: 'Either topic or scriptureReference must be provided.',
    path: ['topic', 'scriptureReference'],
  });
export type GenerateLessonPromptsInput = z.infer<
  typeof GenerateLessonPromptsInputSchema
>;

const GenerateLessonPromptsOutputSchema = z.object({
  prompts: z
    .array(z.string())
    .describe('A list of thought-provoking discussion prompts.'),
});
export type GenerateLessonPromptsOutput = z.infer<
  typeof GenerateLessonPromptsOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'generateLessonPromptsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: GenerateLessonPromptsInputSchema},
  output: {schema: GenerateLessonPromptsOutputSchema},
  prompt: `You are an AI assistant specialized in generating thought-provoking discussion prompts for educational and spiritual lessons.

Generate several discussion prompts (around 3-5) based on the following input. The prompts should encourage deep thought, reflection, and interactive discussion among participants. Ensure the prompts are open-ended and avoid yes/no questions.

Input Details:
{{#if topic}}Topic: {{{topic}}}{{/if}}
{{#if scriptureReference}}Scripture Reference: {{{scriptureReference}}}{{/if}}

Focus on creating prompts that are relevant, engaging, and suitable for a teaching platform like StudyForge, catering to a diverse audience including older users by using clear and concise language.
`,
});

const generateLessonPromptsFlow = ai.defineFlow(
  {
    name: 'generateLessonPromptsFlow',
    inputSchema: GenerateLessonPromptsInputSchema,
    outputSchema: GenerateLessonPromptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function generateLessonPrompts(
  input: GenerateLessonPromptsInput
): Promise<GenerateLessonPromptsOutput> {
  return generateLessonPromptsFlow(input);
}
