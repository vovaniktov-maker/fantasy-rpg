import { gameBridge } from '../../game/bridge/GameBridge';

export interface MerchantViewOffer { id: string; name: string; price: number; quantity: number; }

export function MerchantPanel({ open, offers }: { open: boolean; offers: MerchantViewOffer[] }) {
  if (!open) return null;
  return (
    <section className="panel merchant-panel" aria-label="Merchant">
      <h2>Merchant</h2>
      {offers.map((offer) => (
        <div className="merchant-row" key={offer.id}>
          <span>{offer.name} ×{offer.quantity}</span><strong>{offer.price}g</strong>
          <button disabled={offer.quantity <= 0} onClick={() => gameBridge.dispatch({ type: 'BUY_ITEM', itemId: offer.id })}>Buy</button>
        </div>
      ))}
    </section>
  );
}
