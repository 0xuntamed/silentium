import { useSyncExternalStore } from 'react'

/**
 * The cart is UI only: no checkout, no network, nothing stored. It is a tiny external store so the
 * nav, the drawer and the CTA share one source of truth without a provider.
 */
export type ProductId = 'one' | 'buds'

export const PRODUCTS: Record<ProductId, { name: string; kind: string; price: number }> = {
  one: { name: 'SILENTIUM One', kind: 'Over-ear · Adaptive ANC', price: 449 },
  buds: { name: 'SILENTIUM Buds', kind: 'True wireless earbuds', price: 199 },
}

export interface CartItem {
  /** `${id}:${finish}` — one line per product/finish pair. */
  key: string
  id: ProductId
  finish: string
  qty: number
}

export interface CartState {
  items: CartItem[]
  open: boolean
}

const MAX_QTY = 9
let state: CartState = { items: [], open: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (next: CartState) => {
  state = next
  emit()
}

export const getCart = () => state
export const itemKey = (id: ProductId, finish: string) => `${id}:${finish}`

/** Add one unit (merging with an existing line) and open the drawer. */
export function addItem(id: ProductId, finish: string) {
  const key = itemKey(id, finish)
  const found = state.items.find((i) => i.key === key)
  const items = found
    ? state.items.map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i))
    : [...state.items, { key, id, finish, qty: 1 }]
  set({ items, open: true })
}

export function setQty(key: string, qty: number) {
  const items = state.items
    .map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY, Math.floor(qty)) } : i))
    .filter((i) => i.qty > 0)
  set({ ...state, items })
}

export const removeItem = (key: string) => set({ ...state, items: state.items.filter((i) => i.key !== key) })
export const openCart = () => {
  if (!state.open) set({ ...state, open: true })
}
export const closeCart = () => {
  if (state.open) set({ ...state, open: false })
}
export const resetCart = () => set({ items: [], open: false })

export const count = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0)
export const subtotal = (items: CartItem[]) => items.reduce((s, i) => s + PRODUCTS[i.id].price * i.qty, 0)
export const money = (n: number) => `$${n.toLocaleString('en-US')}`

export function useCart() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )
}
