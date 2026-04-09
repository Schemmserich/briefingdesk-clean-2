import { Navigation } from "@/components/Navigation";
import { BriefingDashboard } from "@/components/BriefingDashboard";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-headline font-bold text-white tracking-tight">Intelligence Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-lg">Select your criteria and generate a professionally curated news briefing in seconds.</p>
        </div>
        <BriefingDashboard />
      </main>
      <footer className="py-10 border-t border-white/5 text-center">
        <p className="text-xs text-muted-foreground">© 2024 BriefingDesk. Powered by GenAI Intelligence Architecture.</p>
      </footer>
    </div>
  );
}