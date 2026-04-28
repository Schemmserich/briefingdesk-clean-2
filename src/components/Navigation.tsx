"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentTesterAccountId, getOrCreateDeviceId } from "@/lib/testerIdentity";

type NavItem = {
  label: string;
  href: string;
  icon: any;
};

export function Navigation() {
  const pathname = usePathname();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminEligibility() {
      try {
        getOrCreateDeviceId();
        const accountId = getCurrentTesterAccountId();

        if (!accountId) {
          setShowAdmin(false);
          return;
        }

        document.cookie = `newsbriefing_account_id=${accountId}; path=/; SameSite=Lax`;

        const response = await fetch("/api/admin-session", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();
        setShowAdmin(!!result?.isEligibleAdmin);
      } catch {
        setShowAdmin(false);
      }
    }

    checkAdminEligibility();
  }, [pathname]);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Archiv", href: "/history", icon: History },
  ];

  if (showAdmin) {
    navItems.push({ label: "Admin", href: "/admin", icon: Shield });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-3 min-w-0">
          <Link
            href="/"
            className="min-w-0 shrink flex items-center gap-2 overflow-hidden"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary font-bold">
              N
            </div>
            <span className="truncate text-base sm:text-xl font-headline font-bold text-white tracking-tight">
              News Briefing
            </span>
          </Link>

          <nav className="min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-full">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}