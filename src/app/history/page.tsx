import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, Star, Trash2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper to generate dynamic recent dates
const getRecentDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const mockHistory = [
  { id: '1', title: 'Morning Markets Update', type: 'Executive Summary', date: getRecentDate(0), lang: 'en' },
  { id: '2', title: 'Tech Regulation Brief', type: 'Short Update', date: getRecentDate(1), lang: 'en' },
  { id: '3', title: 'Global Energy Pulse', type: 'Morning Briefing', date: getRecentDate(2), lang: 'de' },
];

export default function HistoryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-headline font-bold text-white">Archives & Presets</h1>
          <Button variant="outline" className="border-white/10 hover:bg-white/5">Export All</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm uppercase tracking-widest font-bold text-muted-foreground px-1">Recent Briefings</h2>
            <div className="space-y-4">
              {mockHistory.map((item) => (
                <Card key={item.id} className="briefing-card border-white/5 hover:bg-white/[0.04] cursor-pointer">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <History className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{item.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(item.date).toLocaleDateString()}
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter">
                            {item.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase border-white/10">
                            {item.lang.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                      <ArrowUpRight className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-sm uppercase tracking-widest font-bold text-muted-foreground px-1">Saved Presets</h2>
            <Card className="briefing-card border-accent/20 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  Morning Brew
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Politics, Economy • Global, Europe • Executive Summary</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-accent hover:bg-accent/90 flex-1">Apply</Button>
                  <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 text-muted-foreground">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="briefing-card border-white/5 bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tech Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Technology • North America • Short Update</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 flex-1">Apply</Button>
                  <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 text-muted-foreground">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
