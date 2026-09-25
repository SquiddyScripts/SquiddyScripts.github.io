import { create } from 'zustand';

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
  setColor: (color: JacketColor) => void;
  setSize: (size: JacketSize) => void;
  setField: (field: OrderField, value: string) => void;
  setFocused: (field: OrderField | null) => void;
  setStatus: (status: OrderStatus, message?: string) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  color: 'Maroon',
  size: null,
  name: '',
  email: '',
  focused: null,
  status: 'idle',
  message: '',
  setColor: (color) => set(() => ({ color })),
  setSize: (size) => set(() => ({ size })),
  setField: (field, value) => set(() => ({ [field]: value }) as Pick<OrderStore, OrderField>),
  setFocused: (focused) => set(() => ({ focused })),
  setStatus: (status, message = '') => set(() => ({ status, message })),
}));
