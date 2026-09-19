import { useGameSnapshot } from '../useGameSnapshot';

const slots = ['weapon','offhand','head','body','gloves','boots','amulet','ring1','ring2'] as const;

export function EquipmentPanel({ open }: { open: boolean }) {
  const state = useGameSnapshot();
  if (!open) return null;
  return (
    <section className="panel equipment-panel" aria-label="Equipment">
      <h2>Equipment</h2>
      {slots.map((slot) => <div className="equipment-row" key={slot}><span>{slot}</span><strong>{state.equipment[slot] ?? 'Empty'}</strong></div>)}
    </section>
  );
}
