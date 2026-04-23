import { Navigation } from "@/components/Navigation";
import { BriefingDashboard } from "@/components/BriefingDashboard";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6 lg:py-8" translate="no">
        <BriefingDashboard />
      </main>
    </>
  );
}