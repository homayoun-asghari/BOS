import { AnimatedHero } from "@/components/animated/AnimatedHero";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function Home() {
  return (
    <>
      <AnimatedHero />
      <div className="fixed bottom-6 right-6">
        <ThemeToggle />
      </div>
    </>
  );
}
