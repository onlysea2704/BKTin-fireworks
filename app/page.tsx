import InteractiveFireworks from '@/app/components/InteractiveFireworks';

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <InteractiveFireworks initialWishes={[]} />
    </main>
  );
}