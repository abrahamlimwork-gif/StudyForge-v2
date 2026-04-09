
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Plus, Video, Calendar, BookOpen } from 'lucide-react';
import { LessonPrompts } from '@/components/lesson-prompts';

interface Session {
  id: string;
  roomName: string;
  topic: string;
  createdAt: Timestamp;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Session[];
      setSessions(docs);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newTopic) return;
    try {
      await addDoc(collection(db, 'sessions'), {
        roomName: newRoomName.replace(/\s+/g, '-').toLowerCase(),
        topic: newTopic,
        createdAt: Timestamp.now(),
        creatorId: user?.uid,
      });
      setNewRoomName('');
      setNewTopic('');
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-12 px-6">
        <header className="mb-12 space-y-4">
          <h1 className="text-5xl font-headline text-primary">Your Teaching Dashboard</h1>
          <p className="text-2xl text-muted-foreground">Hello, {user.displayName || user.email}. Ready for today's lesson?</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Create Session Section */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Plus className="size-8 text-primary" />
                  New Session
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <form onSubmit={handleCreateSession} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-xl font-bold">Lesson Topic</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. The Parable of the Sower" 
                      className="h-14 text-xl"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="room" className="text-xl font-bold">Room Name</Label>
                    <Input 
                      id="room" 
                      placeholder="e.g. morning-bible-study" 
                      className="h-14 text-xl"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-16 text-2xl bg-secondary hover:bg-secondary/90 font-bold">
                    Start Classroom
                  </Button>
                </form>
              </CardContent>
            </Card>

            <LessonPrompts />
          </div>

          {/* Sessions List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-headline flex items-center gap-3 mb-6">
              <Calendar className="size-8 text-primary" />
              Recent Sessions
            </h2>
            
            {sessions.length === 0 ? (
              <Card className="border-dashed border-4 p-12 text-center">
                <CardContent>
                  <BookOpen className="size-16 mx-auto text-muted mb-4" />
                  <p className="text-2xl text-muted-foreground">No sessions yet. Create your first one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-1 gap-6">
                {sessions.map((session) => (
                  <Card key={session.id} className="border-2 hover:border-primary transition-all shadow-md overflow-hidden group">
                    <div className="flex flex-col md:flex-row items-center p-8 gap-8">
                      <div className="bg-primary/10 rounded-xl p-6 group-hover:bg-primary/20 transition-colors">
                        <Video className="size-12 text-primary" />
                      </div>
                      <div className="flex-grow text-center md:text-left space-y-2">
                        <h3 className="text-3xl font-bold text-primary">{session.topic}</h3>
                        <p className="text-xl text-muted-foreground">Room: {session.roomName}</p>
                        <p className="text-lg text-muted-foreground italic">
                          Created {session.createdAt.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="lg" 
                        className="h-16 px-10 text-2xl font-bold bg-primary"
                        onClick={() => router.push(`/classroom/${session.roomName}`)}
                      >
                        Join Room
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
