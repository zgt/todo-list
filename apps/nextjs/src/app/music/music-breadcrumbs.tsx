"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

function useBreadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{
    leagueId?: string;
    roundId?: string;
  }>();

  const crumbs: { label: string; href: string }[] = [
    { label: "Music Leagues", href: "/music" },
  ];

  if (params.leagueId) {
    crumbs.push({
      label: "League",
      href: `/music/leagues/${params.leagueId}`,
    });
  }

  if (params.leagueId && pathname.includes("/rounds/create")) {
    crumbs.push({
      label: "New Round",
      href: pathname,
    });
  } else if (params.leagueId && params.roundId) {
    const isPlaylist = pathname.endsWith("/playlist");
    crumbs.push({
      label: "Round",
      href: `/music/leagues/${params.leagueId}/rounds/${params.roundId}`,
    });
    if (isPlaylist) {
      crumbs.push({
        label: "Playlist",
        href: pathname,
      });
    }
  }

  if (pathname === "/music/leagues/create") {
    return [
      { label: "Music Leagues", href: "/music" },
      { label: "Create League", href: pathname },
    ];
  }

  return crumbs;
}

export function MusicBreadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs();

  // Don't show breadcrumbs on the dashboard itself
  if (pathname === "/music") return null;

  return (
    <div className="border-border/40 mb-4 border-b border-dashed pb-3">
      <nav
        className="flex items-center gap-1.5 text-sm"
        aria-label="Breadcrumb"
      >
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <div key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5" />
              {isLast ? (
                <span className="text-foreground font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
