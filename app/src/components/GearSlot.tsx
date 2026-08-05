import type { GearSlot } from '../lib/types';

export function GearSlotView({ slot }: { slot: GearSlot }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        {slot.slot.icon_url && <img src={slot.slot.icon_url} alt="" className="h-6 w-6" />}
        <strong className="font-display text-sm text-fg">{slot.slot.name}</strong>
      </div>
      <ul className="space-y-1.5">
        {slot.sets.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            {s.icon_url && <img src={s.icon_url} alt="" className="h-5 w-5" />}
            <span className="text-sm text-fg">{s.name}</span>
            <span className="text-xs text-muted">{s.desc}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-0.5 text-xs text-muted">
        <div><span className="text-subtle">Principal:</span> {slot.main_attrs.map((a) => a.name).join(', ')}</div>
        <div><span className="text-subtle">Secundários:</span> {slot.sub_attrs.map((a) => a.name).join(', ')}</div>
      </div>
    </div>
  );
}
