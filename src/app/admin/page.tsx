import { Navigation } from "@/components/Navigation";
import { SourceAdmin } from "@/components/SourceAdmin";

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <SourceAdmin />
      </main>
    </div>
  );
}