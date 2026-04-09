
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-church');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-2xl text-primary animate-pulse font-headline">Loading StudyForge...</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <div className="relative h-[70vh] w-full">
          <Image
            src={heroImage?.imageUrl || "https://picsum.photos/seed/studyforge-hero/1200/600"}
            alt="StudyForge Background"
            fill
            className="object-cover brightness-[0.4]"
            priority
            data-ai-hint="church sanctuary"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
            <h1 className="text-7xl md:text-9xl font-headline mb-6 drop-shadow-2xl">StudyForge</h1>
            <p className="text-2xl md:text-4xl max-w-3xl mb-12 font-light drop-shadow-lg leading-tight">
              Empowering church communities through digital wisdom and interactive learning.
            </p>
            <div className="flex gap-6">
              <Link href="/login">
                <Button size="lg" className="text-2xl h-20 px-12 font-bold bg-secondary hover:bg-secondary/90 shadow-xl">
                  Start Learning Today
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <section className="max-w-6xl mx-auto py-32 px-6 text-center">
          <h2 className="text-5xl font-headline mb-16 text-primary">Designed for Every Generation</h2>
          <div className="grid md:grid-cols-3 gap-16 text-left">
            <div className="space-y-6 p-8 rounded-2xl bg-white shadow-md border-t-4 border-primary">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center text-primary">
                <span className="text-4xl font-bold">1</span>
              </div>
              <h3 className="text-3xl font-bold text-primary">Simple Login</h3>
              <p className="text-xl text-muted-foreground leading-relaxed">Easy access with Google or a simple email link. No complex passwords to remember, ever.</p>
            </div>
            <div className="space-y-6 p-8 rounded-2xl bg-white shadow-md border-t-4 border-secondary">
              <div className="bg-secondary/10 w-20 h-20 rounded-full flex items-center justify-center text-secondary">
                <span className="text-4xl font-bold">2</span>
              </div>
              <h3 className="text-3xl font-bold text-primary">Clear Interface</h3>
              <p className="text-xl text-muted-foreground leading-relaxed">Large fonts and high-contrast buttons designed for maximum readability and ease of use for all ages.</p>
            </div>
            <div className="space-y-6 p-8 rounded-2xl bg-white shadow-md border-t-4 border-primary">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center text-primary">
                <span className="text-4xl font-bold">3</span>
              </div>
              <h3 className="text-3xl font-bold text-primary">Live Classroom</h3>
              <p className="text-xl text-muted-foreground leading-relaxed">Engage in real-time teaching sessions with video conferencing built directly into your classroom experience.</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-primary text-primary-foreground py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-3xl font-headline font-bold">StudyForge</p>
          <p className="text-xl opacity-80">Building the future of spiritual education together.</p>
          <p className="text-lg opacity-60 pt-8">&copy; 2024 StudyForge Teaching Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
