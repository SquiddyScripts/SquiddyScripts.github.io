import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { JacketColor, JacketSize } from './orderStore';

export interface CartItem {
  color: JacketColor;
  size: JacketSize;
  qty: number;
  price: number;
}

// The steps of the checkout room, in the order the camera visits them.
export type CheckoutStage = 'shop' | 'desk' | 'address' | 'pay' | 'paying' | 'receipt' | 'shipping' | 'done';

export type AddressField = 'name' | 'line1' | 'line2' | 'city' | 'region' | 'postal' | 'country' | 'email';

export type Address = Record<AddressField, string>;

export const ADDRESS_FIELDS: { id: AddressField, label: string, placeholder: string, optional?: boolean }[] = [
  { id: 'name', label: 'Who is it for?', placeholder: 'Full name' },
  { id: 'line1', label: 'Street', placeholder: '123 Blossom Lane' },
  { id: 'line2', label: 'Apartment, suite', placeholder: 'Optional', optional: true },
  { id: 'city', label: 'City', placeholder: 'Centreville' },
  { id: 'region', label: 'State or region', placeholder: 'VA' },
  { id: 'postal', label: 'Postal code', placeholder: '20120' },
  { id: 'country', label: 'Country', placeholder: 'United States' },
  { id: 'email', label: 'Where should the receipt go?', placeholder: 'you@email.com' },
];

interface CartStore {
  items: CartItem[];
  stage: CheckoutStage;
  address: Address;
  field: number;
  orderNumber: number | null;
  add: (item: Omit<CartItem, 'qty'>) => void;
  remove: (index: number) => void;
  setStage: (stage: CheckoutStage) => void;
  setAddress: (field: AddressField, value: string) => void;
  setField: (field: number) => void;
  complete: (orderNumber: number) => void;
  reset: () => void;
  clear: () => void;
}

const EMPTY_ADDRESS: Address = { name: '', line1: '', line2: '', city: '', region: '', postal: '', country: 'United States', email: '' };

// The cart and the address survive a reload; where the camera was in checkout does not.
export const useCartStore = create<CartStore>()(persist((set) => ({
  items: [],
  stage: 'shop',
  address: EMPTY_ADDRESS,
  field: 0,
  orderNumber: null,
  add: (item) => set((state) => {
    const same = state.items.findIndex((i) => i.color === item.color && i.size === item.size);
    if (same < 0) return { items: [...state.items, { ...item, qty: 1 }] };
    return { items: state.items.map((i, n) => n === same ? { ...i, qty: Math.min(3, i.qty + 1) } : i) };
  }),
  remove: (index) => set((state) => ({ items: state.items.filter((_, n) => n !== index) })),
  setStage: (stage) => set(() => ({ stage })),
  setAddress: (field, value) => set((state) => ({ address: { ...state.address, [field]: value } })),
  setField: (field) => set(() => ({ field })),
  complete: (orderNumber) => set(() => ({ orderNumber, stage: 'receipt' })),
  reset: () => set(() => ({ stage: 'shop' })),
  clear: () => set(() => ({ items: [], field: 0, orderNumber: null })),
}), {
  name: 'confessions-cart',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ items, address }) => ({ items, address }),
}));

export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.qty, 0);
