import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type JacketColor = 'Maroon' | 'Black';
export type JacketSize = 'Small' | 'Medium' | 'Large';
export type OrderField = 'name' | 'email' | 'line1' | 'city' | 'region' | 'postal' | 'country';
export type OrderStatus = 'idle' | 'sending' | 'sent' | 'error';
// Checkout turns the hang tag over: the front picks the jacket, the back is its mailing label.
export type TagSide = 'front' | 'back';

interface OrderStore {
  color: JacketColor;
  size: JacketSize | null;
  name: string;
  email: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  focused: OrderField | null;
  side: TagSide;
  status: OrderStatus;
  message: string;
  // The finale's big word: RESERVED, CHECKOUT on the way to payment, YOURS once paid.
  headline: string;
  // True only for a reservation that just landed, so the finale plays once; a saved one just shows.
  celebrate: boolean;
  setColor: (color: JacketColor) => void;
  setSize: (size: JacketSize) => void;
  setField: (field: OrderField, value: string) => void;
  setFocused: (field: OrderField | null) => void;
  setSide: (side: TagSide) => void;
  setStatus: (status: OrderStatus, message?: string, headline?: string) => void;
}

// A finished reservation is kept in the browser, so leaving the shop or reloading still shows it.
export const useOrderStore = create<OrderStore>()(persist((set) => ({
  color: 'Maroon',
  size: null,
  name: '',
  email: '',
  line1: '',
  city: '',
  region: '',
  postal: '',
  country: 'United States',
  focused: null,
  side: 'front',
  status: 'idle',
  message: '',
  headline: 'RESERVED',
  celebrate: false,
  setColor: (color) => set(() => ({ color })),
  setSize: (size) => set(() => ({ size })),
  setField: (field, value) => set(() => ({ [field]: value }) as Pick<OrderStore, OrderField>),
  setFocused: (focused) => set(() => ({ focused })),
  setSide: (side) => set(() => ({ side })),
  setStatus: (status, message = '', headline) => set((state) => ({
    status,
    message,
    headline: headline ?? state.headline,
    celebrate: status === 'sent' && state.status === 'sending',
    side: status === 'idle' ? 'front' : state.side,
  })),
}), {
  name: 'confessions-order',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ color, size, name, email, line1, city, region, postal, country, status, message, headline }) => ({
    color,
    size,
    name,
    email,
    line1,
    city,
    region,
    postal,
    country,
    status: status === 'sent' ? status : 'idle',
    message: status === 'sent' ? message : '',
    headline,
  }),
}));
