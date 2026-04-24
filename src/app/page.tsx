import { Navigation } from "@/components/Navigation";
import { BriefingDashboard } from "@/components/BriefingDashboard";
import { TesterAccessGate } from "@/components/TesterAccessGate";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <TesterAccessGate>
        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6 lg:py-8">
          <BriefingDashboard />
        </main>
      </TesterAccessGate>
    </>
  );
}