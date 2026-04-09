"use client";

import { useState } from "react";
import { SourceConfig } from "@/lib/types";
import { MOCK_SOURCES } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ShieldCheck, Globe, Star, MoreVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SourceAdmin() {
  const [sources, setSources] = useState<SourceConfig[]>(MOCK_SOURCES);
  const [search, setSearch] = useState("");

  const toggleSource = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s));
  };

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-white">Source Intelligence</h1>
          <p className="text-muted-foreground mt-1">Manage verified news sources and their trust parameters.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">Add New Source</Button>
      </div>

      <Card className="briefing-card border-white/5">
        <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Whitelisted Sources
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by name or region..." 
              className="pl-9 bg-white/5 border-white/10 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="w-12"></TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Source</TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Region</TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Category</TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Trust Score</TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider text-center">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSources.map((source) => (
                <TableRow key={source.id} className="border-white/5 hover:bg-white/[0.01]">
                  <TableCell>
                    <div className={cn("w-2 h-2 rounded-full", source.isEnabled ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500")} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{source.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{source.baseUrl}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10 text-muted-foreground font-normal">
                      <Globe className="w-3 h-3 mr-1" /> {source.region}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{source.category}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full", 
                            source.trustScore > 90 ? "bg-primary" : "bg-accent"
                          )} 
                          style={{ width: `${source.trustScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono">{source.trustScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={source.isEnabled} 
                      onCheckedChange={() => toggleSource(source.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="briefing-card border-white/5 p-6 space-y-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h4 className="font-bold text-white">Quality Guard</h4>
          <p className="text-xs text-muted-foreground">Only sources with trust scores above 70 are eligible for automated summaries.</p>
        </Card>
        <Card className="briefing-card border-white/5 p-6 space-y-2">
          <Globe className="w-8 h-8 text-accent" />
          <h4 className="font-bold text-white">Global Reach</h4>
          <p className="text-xs text-muted-foreground">Currently covering 12 regions with native-language source support enabled.</p>
        </Card>
        <Card className="briefing-card border-white/5 p-6 space-y-2">
          <Star className="w-8 h-8 text-yellow-500" />
          <h4 className="font-bold text-white">Premium Sources</h4>
          <p className="text-xs text-muted-foreground">3 sources configured for metadata-only mode to respect paywall boundaries.</p>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}