import React, { useState } from 'react';
import { CreditCard, ShieldCheck, AlertCircle, Zap } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { stripeProducts } from '../stripe-config';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { MODELS } from '../lib/models';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ open, onOpenChange }) => {
  const { user, session } = useAuth();
  const { balance } = useCredits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = async (priceId: string) => {
    if (!user || !session?.access_token) {
      setError('Sign in to buy credits.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}?purchase=success`,
          cancel_url: `${window.location.origin}?purchase=cancelled`,
          mode: 'payment',
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not start checkout');
      }
      const { url } = await response.json();
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
    } finally {
      setLoading(false);
    }
  };

  const lite = MODELS['gemini-3.1-flash-lite-image'];
  const std = MODELS['gemini-nano-banana-2.1'];
  const pro = MODELS['gemini-3-pro-image'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Get credits" description={`You have ${balance} credits. One credit is one Lite image.`} size="md">
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {stripeProducts.map((product) => (
          <div key={product.priceId} className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent-text" />
                  <h3 className="font-display text-base font-semibold text-ink">{product.credits} credits</h3>
                </div>
                <p className="mt-1 text-xs text-muted">Never expire. Spend them on any model at any size.</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-semibold text-ink">${product.price.toFixed(0)}</div>
                <div className="text-[11px] text-muted">${(product.price / product.credits).toFixed(3)} per credit</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Pack n={Math.floor(product.credits / lite.credits['1K'])} label={`${lite.name} 1K`} />
              <Pack n={Math.floor(product.credits / std.credits['2K'])} label={`${std.name} 2K`} />
              <Pack n={Math.floor(product.credits / pro.credits['4K'])} label={`${pro.name} 4K`} />
            </div>

            <Button size="lg" className="mt-4 w-full" onClick={() => purchase(product.priceId)} loading={loading}>
              <CreditCard className="h-4 w-4" /> Buy {product.credits} credits
            </Button>
          </div>
        ))}

        <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-[11px] leading-relaxed text-muted">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Credit prices per image
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-muted">
                <th className="font-medium">Model</th>
                <th className="text-center font-medium">512</th>
                <th className="text-center font-medium">1K</th>
                <th className="text-center font-medium">2K</th>
                <th className="text-center font-medium">4K</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {[lite, std, pro].map((m) => (
                <tr key={m.id}>
                  <td className="py-0.5">{m.name}</td>
                  {(['512', '1K', '2K', '4K'] as const).map((s) => (
                    <td key={s} className="text-center font-mono">
                      {m.sizes.includes(s) ? m.credits[s] : '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2">Search grounding adds 1 credit. Failed renders are refunded automatically. Payments run through Stripe.</p>
        </div>
      </div>
    </Dialog>
  );
};

const Pack: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div className="rounded-lg border border-line bg-surface p-2">
    <div className="font-display text-lg font-semibold text-ink">{n}</div>
    <div className="text-[10px] leading-tight text-muted">{label}</div>
  </div>
);
