import type { GearSlot } from '../lib/types';

export function GearSlotView({ slot }: { slot: GearSlot }) {
  return (
    <div className="gear-slot">
      <div className="gear-slot-head">
        {slot.slot.icon_url && <img src={slot.slot.icon_url} alt="" />}
        <strong>{slot.slot.name}</strong>
      </div>
      <ul className="gear-sets">
        {slot.sets.map((s) => (
          <li key={s.id}>
            {s.icon_url && <img src={s.icon_url} alt="" />}
            <span className="set-name">{s.name}</span>
            <span className="set-desc">{s.desc}</span>
          </li>
        ))}
      </ul>
      <div className="gear-attrs">
        <div className="main"><span>Principal:</span> {slot.main_attrs.map((a) => a.name).join(', ')}</div>
        <div className="sub"><span>Secundários:</span> {slot.sub_attrs.map((a) => a.name).join(', ')}</div>
      </div>
    </div>
  );
}
