"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Database, History, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Sources", href: "/admin", icon: Database },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="glass-morphism h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Newspaper className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-headline font-bold text-white tracking-tight">
          Briefing<span className="text-accent">Desk</span>
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
                isActive 
                  ? "bg-primary/20 text-primary-foreground border border-primary/20" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="w-8" /> {/* Spacer */}
    </nav>
  );
}