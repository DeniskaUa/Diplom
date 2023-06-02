import { HeroSection } from '~/components/HeroSection';
import { Editor } from '~/components/Editor';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full max-w-7xl flex-col px-10">
      <HeroSection />
      <Editor />
    </main>
  );
}
