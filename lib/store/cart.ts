import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  menuItemId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  imageUrl?: string;
  isVeg: boolean;
}

export interface CartState {
  items: CartItem[];
  note: string;
  add: (item: Omit<CartItem, 'quantity'>) => void;
  setQuantity: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setNote: (note: string) => void;
  subtotalPaise: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      note: '',
      add: (item) => {
        const existing = get().items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.menuItemId === item.menuItemId
                ? { ...i, quantity: Math.min(20, i.quantity + 1) }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },
      setQuantity: (id, qty) => {
        if (qty <= 0) {
          get().remove(id);
        } else {
          set({
            items: get().items.map((i) =>
              i.menuItemId === id ? { ...i, quantity: Math.min(20, qty) } : i
            ),
          });
        }
      },
      remove: (id) => {
        set({ items: get().items.filter((i) => i.menuItemId !== id) });
      },
      clear: () => {
        set({ items: [], note: '' });
      },
      setNote: (note) => {
        set({ note: note.slice(0, 200) });
      },
      subtotalPaise: () => {
        return get().items.reduce(
          (sum, item) => sum + item.pricePaise * item.quantity,
          0
        );
      },
      count: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'rollit_cart_v1',
    }
  )
);

