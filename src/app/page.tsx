
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-church');

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <div className="relative h-[60vh] w-full">
          <Image
            src={heroImage?.imageUrl || "https://picsum.photos/seed/1/1200/600"}
            alt="StudyForge Background"
            fill
            className="object-cover brightness-50"
            priority
            data-ai-hint="church sanctuary"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
            <h1 className="text-6xl md:text-8xl font-headline mb-6">StudyForge</h1>
            <p className="text-2xl md:text-3xl max-w-2xl mb-12 font-light">
              Empowering church communities through digital wisdom and interactive learning.
            </p>
            <div className="flex gap-6">
              <Link href="/login">
                <Button size="lg" className="text-2xl h-16 px-10 font-bold bg-secondary hover:bg-secondary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <section className="max-w-5xl mx-auto py-24 px-6 text-center">
          <h2 className="text-4xl font-headline mb-12">Designed for Every Generation</h2>
          <div className="grid md:grid-cols-3 gap-12 text-left">
            <div className="space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary">
                <span className="text-3xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold">Simple Login</h3>
              <p className="text-xl text-muted-foreground">Easy access with Google or a simple email link. No complex passwords to remember.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary">
                <span className="text-3xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold">Clear Interface</h3>
              <p className="text-xl text-muted-foreground">Large fonts and high-contrast buttons designed for maximum readability and ease of use.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary">
                <span className="text-3xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold">Interactive Learning</h3>
              <p className="text-xl text-muted-foreground">Engage in live teaching sessions with video conferencing built directly into your classroom.</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-primary text-primary-foreground py-12 px-6 text-center">
        <p className="text-xl opacity-80">&copy; 2024 StudyForge Teaching Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
