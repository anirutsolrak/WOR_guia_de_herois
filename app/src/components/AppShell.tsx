import type { ReactNode } from 'react';

export function AppShell({
  title, subtitle, search, onSearch, children,
}: {
  title: string;
  subtitle?: string;
  search?: string;
  onSearch?: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="relative overflow-hidden border-b border-border
                         bg-[radial-gradient(120%_140%_at_80%_-20%,rgba(80,140,255,0.22),transparent_60%)]">
        <div className="mx-auto max-w-5xl px-5 py-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg
                             bg-gradient-to-br from-accent to-accent-2 text-sm
                             shadow-[0_3px_10px_rgba(80,140,255,0.5)]">◉</span>
            <span className="bg-gradient-to-r from-[#cfe0ff] to-[#9ab6ff] bg-clip-text
                             font-display font-extrabold tracking-tight text-transparent">
              WoR Guia
            </span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          {onSearch && (
            <div className="mt-4 flex max-w-sm items-center gap-2 rounded-lg border border-border-strong
                            bg-surface px-3 py-2 text-sm text-muted focus-within:border-accent">
              <span aria-hidden>🔎</span>
              <input
                type="text"
                value={search ?? ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar modo…"
                aria-label="Buscar modo"
                className="w-full bg-transparent text-fg placeholder:text-subtle focus:outline-none"
              />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
