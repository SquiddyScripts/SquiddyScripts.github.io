// Paste a Stripe Payment Link here (Stripe Dashboard → Payment links → New, $150, collect
// shipping address, limit to 30 payments). While it's empty the shop keeps taking reservations.
// Set the link's "After payment" redirect to https://squiddyscripts.github.io/?paid=1
export const PAYMENT_LINK = '';

export const BUY_ENABLED = PAYMENT_LINK.length > 0;
