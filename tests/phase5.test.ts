import { beforeEach, describe, expect, it } from 'vitest'
import { addItem, closeCart, count, getCart, money, openCart, PRODUCTS, removeItem, resetCart, setQty, subtotal } from '../src/lib/cart'
import { isEmail } from '../src/lib/email'
import { GLYPHS, GLYPH_H, GLYPH_W, textToDots, textWidth } from '../src/scenes/Specs/dotFont'

describe('cart (UI-only store)', () => {
  beforeEach(resetCart)
  it('starts empty and closed', () => {
    expect(getCart().items).toEqual([])
    expect(getCart().open).toBe(false)
  })
  it('adds, merges by product+finish, and opens the drawer', () => {
    addItem('one', 'Basalt')
    addItem('one', 'Basalt')
    addItem('one', 'Bone')
    addItem('buds', 'Basalt')
    expect(getCart().open).toBe(true)
    expect(getCart().items).toHaveLength(3)
    expect(count(getCart().items)).toBe(4)
    expect(getCart().items.find((i) => i.key === 'one:Basalt')!.qty).toBe(2)
  })
  it('totals and formats money', () => {
    addItem('one', 'Basalt')
    addItem('buds', 'Basalt')
    expect(subtotal(getCart().items)).toBe(PRODUCTS.one.price + PRODUCTS.buds.price)
    expect(money(1234)).toBe('$1,234')
  })
  it('changes quantity, caps it, and removes at zero', () => {
    addItem('one', 'Basalt')
    setQty('one:Basalt', 4)
    expect(getCart().items[0].qty).toBe(4)
    setQty('one:Basalt', 99)
    expect(getCart().items[0].qty).toBe(9)
    setQty('one:Basalt', 0)
    expect(getCart().items).toHaveLength(0)
  })
  it('removes a line and toggles the drawer without touching items', () => {
    addItem('one', 'Basalt')
    closeCart()
    expect(getCart().open).toBe(false)
    openCart()
    expect(getCart().open).toBe(true)
    removeItem('one:Basalt')
    expect(getCart().items).toHaveLength(0)
  })
})

describe('email check', () => {
  it('accepts ordinary addresses', () => {
    for (const e of ['a@b.co', 'first.last@example.com', ' me@sub.domain.org ']) expect(isEmail(e)).toBe(true)
  })
  it('rejects the obvious non-addresses', () => {
    for (const e of ['', 'plain', 'a@b', '@b.com', 'a b@c.com', 'a@b..com', 'a@.com', 'a@b.']) expect(isEmail(e)).toBe(false)
  })
})

describe('dot-matrix font', () => {
  it('every glyph is 7 rows of 5 cells', () => {
    for (const [ch, g] of Object.entries(GLYPHS)) {
      expect(g, ch).toHaveLength(GLYPH_H)
      for (const row of g) expect(row, ch).toMatch(new RegExp(`^[#.]{${GLYPH_W}}$`))
    }
  })
  it('lays text out with one blank column between glyphs', () => {
    const rows = textToDots('60h')
    expect(rows).toHaveLength(GLYPH_H)
    expect(rows[0]).toHaveLength(textWidth('60h'))
    expect(textWidth('60h')).toBe(3 * 5 + 2)
    expect(rows.every((r) => r[5] === false)).toBe(true)
  })
  it('turns unknown characters into spaces', () => {
    expect(textToDots('~').flat().some(Boolean)).toBe(false)
  })
})
