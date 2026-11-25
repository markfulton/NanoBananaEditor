/*
  # One order per Stripe checkout session

  Stripe can deliver checkout.session.completed more than once (retries,
  overlapping deliveries). The webhook now records the order first and only
  adds credits when that insert took the row, which needs a unique key.

  Rows that already repeat a session are soft-deleted (deleted_at, the
  column the table already has), earliest row kept, so the index can be built.
*/

UPDATE stripe_orders o
SET deleted_at = now()
WHERE o.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM stripe_orders k
    WHERE k.checkout_session_id = o.checkout_session_id
      AND k.deleted_at IS NULL
      AND k.id < o.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS stripe_orders_checkout_session_id_key
  ON stripe_orders (checkout_session_id)
  WHERE deleted_at IS NULL;
