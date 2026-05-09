import { useState } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Seite nicht gefunden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wortschatz — German Vocabulary Trainer" },
      { name: "description", content: "Deutsch Noun Deck is a German noun learning app that helps users memorize vocabulary through flashcards." },
      { property: "og:title", content: "Wortschatz — German Vocabulary Trainer" },
      { name: "twitter:title", content: "Wortschatz — German Vocabulary Trainer" },
      { property: "og:description", content: "Deutsch Noun Deck is a German noun learning app that helps users memorize vocabulary through flashcards." },
      { name: "twitter:description", content: "Deutsch Noun Deck is a German noun learning app that helps users memorize vocabulary through flashcards." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f1bda5bb-7fc5-47cd-bbbc-15bd8a7e62b6/id-preview-c96aac66--b672e9a6-6152-4ece-a7c2-bc848c1b9c21.lovable.app-1778083031333.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f1bda5bb-7fc5-47cd-bbbc-15bd8a7e62b6/id-preview-c96aac66--b672e9a6-6152-4ece-a7c2-bc848c1b9c21.lovable.app-1778083031333.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground" }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  );
}

function RootComponent() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="font-bold text-lg tracking-tight shrink-0">
            Wort<span className="text-primary">schatz</span>
          </Link>
          <nav className="hidden md:flex flex-wrap items-center gap-1">
            <NavLink to="/" label="Nouns" />
            <NavLink to="/adjectives" label="Adjectives" />
            <NavLink to="/adverbs" label="Adverbs" />
            <NavLink to="/verbs" label="Verbs" />
            <NavLink to="/import" label="Import" />
            <NavLink to="/campaign" label="Campaign" />
          </nav>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t bg-background px-4 py-2 flex flex-col gap-1" onClick={() => setMenuOpen(false)}>
            <NavLink to="/" label="Nouns" />
            <NavLink to="/adjectives" label="Adjectives" />
            <NavLink to="/adverbs" label="Adverbs" />
            <NavLink to="/verbs" label="Verbs" />
            <NavLink to="/import" label="Import" />
            <NavLink to="/campaign" label="Campaign" />
          </nav>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster richColors />
    </div>
  );
}
