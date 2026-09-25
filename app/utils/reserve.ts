import { JacketColor, JacketSize } from "@stores";

const ORDER_EMAIL = 'amaaninva@gmail.com';

interface Reservation {
  name: string;
  email: string;
  color: JacketColor;
  size: JacketSize;
}

// Stripe carries the colorway, size and name through checkout in client_reference_id, which
// only allows letters, digits, dashes and underscores.
export const checkoutUrl = (link: string, { name, email, color, size }: Reservation) => {
  const url = new URL(link);
  url.searchParams.set('prefilled_email', email.trim());
  url.searchParams.set('client_reference_id', `${color}_${size}_${name.trim()}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 200));
  return url.toString();
};

export const sendReservation = async ({ name, email, color, size, intent = 'reservation' }: Reservation & { intent?: 'reservation' | 'checkout' }) => {
  const response = await fetch(`https://formsubmit.co/ajax/${ORDER_EMAIL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: intent === 'checkout'
        ? `Confessions checkout started: ${color} ${size}`
        : `Confessions reservation: ${color} ${size}`,
      _template: 'table',
      _captcha: 'false',
      name,
      email,
      color,
      size,
    }),
  });
  if (!response.ok) throw new Error(`Reservation failed with ${response.status}`);
};

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
