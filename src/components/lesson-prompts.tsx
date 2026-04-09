
"use client";

import { useState } from 'react';
import { generateLessonPrompts } from '@/ai/flows/generate-lesson-prompts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sparkles, MessageCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LessonPrompts() {
  const [topic, setTopic] = useState('');
  const [scripture, setScripture] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic && !scripture) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please provide a topic or scripture reference.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await generateLessonPrompts({ 
        topic: topic || undefined, 
        scriptureReference: scripture || undefined 
      });
      setPrompts(result.prompts);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'The AI could not generate prompts right now.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 shadow-lg border-primary/20 bg-white">
      <CardHeader className="bg-secondary/10">
        <CardTitle className="text-3xl flex items-center gap-3">
          <Sparkles className="size-8 text-secondary" />
          Lesson Prompt Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 pt-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gen-topic" className="text-xl font-bold">Discussion Topic</Label>
            <Input 
              id="gen-topic" 
              placeholder="e.g. Faith and Persistence" 
              className="h-14 text-xl"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gen-scripture" className="text-xl font-bold">Scripture Reference</Label>
            <Input 
              id="gen-scripture" 
              placeholder="e.g. Hebrews 11:1" 
              className="h-14 text-xl"
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full h-16 text-2xl bg-primary text-white font-bold"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
            {loading ? 'Thinking...' : 'Generate Prompts'}
          </Button>
        </div>

        {prompts.length > 0 && (
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
              <MessageCircle className="size-6" />
              Suggested Questions:
            </h3>
            <ul className="space-y-4">
              {prompts.map((prompt, index) => (
                <li key={index} className="bg-primary/5 p-6 rounded-xl text-xl leading-relaxed border-l-8 border-secondary">
                  "{prompt}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
