import type { Address, CartItem } from "@stores";

// Stand-in for the Cloudflare Worker that will create the Stripe payment and hand out the next
// CONFESSION number. Nothing is charged: it waits like a payment would and returns a number.
export const placeOrder = async (items: CartItem[], address: Address): Promise<number> => {
  void items;
  void address;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const next = Number(localStorage.getItem('confessions-demo-order') ?? '0') + 1;
  localStorage.setItem('confessions-demo-order', String(next));
  return next;
};

export const formatOrder = (n: number | null) => `CONFESSION #${n === null ? '···' : String(n).padStart(3, '0')}`;

export const money = (n: number) => `$${n.toFixed(2)}`;
