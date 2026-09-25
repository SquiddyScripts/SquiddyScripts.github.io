import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type JacketColor = 'Maroon' | 'Black';
export type JacketSize = 'Small' | 'Medium' | 'Large';
export type OrderField = 'name' | 'email';
export type OrderStatus = 'idle' | 'sending' | 'sent' | 'error';

interface OrderStore {
  color: JacketColor;
  size: JacketSize | null;
  name: string;
  email: string;
  focused: OrderField | null;
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
  setStatus: (status: OrderStatus, message?: string, headline?: string) => void;
}

// A finished reservation is kept in the browser, so leaving the shop or reloading still shows it.
export const useOrderStore = create<OrderStore>()(persist((set) => ({
  color: 'Maroon',
  size: null,
  name: '',
  email: '',
  focused: null,
  status: 'idle',
  message: '',
  headline: 'RESERVED',
  celebrate: false,
  setColor: (color) => set(() => ({ color })),
  setSize: (size) => set(() => ({ size })),
  setField: (field, value) => set(() => ({ [field]: value }) as Pick<OrderStore, OrderField>),
  setFocused: (focused) => set(() => ({ focused })),
  setStatus: (status, message = '', headline) => set((state) => ({
    status,
    message,
    headline: headline ?? state.headline,
    celebrate: status === 'sent' && state.status === 'sending',
  })),
}), {
  name: 'confessions-order',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ color, size, name, email, status, message, headline }) => ({
    color,
    size,
    name,
    email,
    status: status === 'sent' ? status : 'idle',
    message: status === 'sent' ? message : '',
    headline,
  }),
}));
