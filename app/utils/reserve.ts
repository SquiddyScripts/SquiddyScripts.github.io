import { JacketColor, JacketSize } from "@stores";

const ORDER_EMAIL = 'amaaninva@gmail.com';

interface Reservation {
  name: string;
  email: string;
  color: JacketColor;
  size: JacketSize;
}

export const sendReservation = async ({ name, email, color, size }: Reservation) => {
  const response = await fetch(`https://formsubmit.co/ajax/${ORDER_EMAIL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: `Confessions reservation: ${color} ${size}`,
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
