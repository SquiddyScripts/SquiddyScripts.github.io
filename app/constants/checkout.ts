// Paste a Stripe Payment Link here (Stripe Dashboard → Payment links → New, $150, collect
// shipping address, limit to 30 payments). While it's empty the shop keeps taking reservations.
// Set the link's "After payment" redirect to https://squiddyscripts.github.io/?paid=1
export const PAYMENT_LINK = '';

export const BUY_ENABLED = PAYMENT_LINK.length > 0;

// The in-scene cart and checkout room. Off on the live site until payments are wired, unless the
// address has ?checkout=1; always on while developing.
export const checkoutEnabled = () => typeof window !== 'undefined' && (
  process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('checkout')
);

export const JACKET_PRICE = 150;
export const SHIPPING_PRICE = 12;
