// Paste a Stripe Payment Link here (Stripe Dashboard → Payment links → New, $150, collect
// shipping address, limit to 30 payments). While it's empty the shop keeps taking reservations.
// Set the link's "After payment" redirect to https://squiddyscripts.github.io/?paid=1
export const PAYMENT_LINK = '';

export const BUY_ENABLED = PAYMENT_LINK.length > 0;

// Checkout on the back of the hang tag. Off on the live site unless the address has ?checkout=1;
// always on while developing.
export const checkoutEnabled = () => typeof window !== 'undefined' && (
  process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('checkout')
);
