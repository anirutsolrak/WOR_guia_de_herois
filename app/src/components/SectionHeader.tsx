export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-[3px] rounded-sm bg-accent" />
      <h2 className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </h2>
    </div>
  );
}
