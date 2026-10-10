/**
 * Product pages and the compare table. ONE source of truth: every spec row carries both products, so a
 * product page and the compare page can never disagree.
 * PLACEHOLDER: every number, price and finish name is fictional.
 */
import type { ProductId } from '../lib/cart'
import { materials } from './copy'

export interface ProductCopy {
  id: ProductId
  path: string
  index: string
  name: string
  short: string
  kind: string
  price: number
  title: readonly [string, string]
  blurb: string
  /** Alt text for the 3D view, which is a canvas behind the page. */
  viewAlt: string
  highlights: { big: string; unit: string; note: string }[]
  parts: readonly string[]
  partsTitle: readonly [string, string]
  partsBody: string
  box: string[]
  meta: string
}

export const productCopy: Record<ProductId, ProductCopy> = {
  one: {
    id: 'one',
    path: '/one',
    index: '01',
    name: 'SILENTIUM One',
    short: 'One',
    kind: 'Over-ear · Adaptive ANC',
    price: 449,
    title: ['Silence,', 'worn.'],
    blurb:
      'Eight microphones, a beryllium-coated driver and a cushion that seals without squeezing. The loudest room you know, turned down to a rumour.',
    viewAlt:
      'SILENTIUM One over-ear headphones: a thin aluminium band, two round cups with brass details and leather cushions. Drag or use the arrow keys to turn the model.',
    highlights: [
      { big: '60', unit: 'h', note: 'Playback, ANC on' },
      { big: '−42', unit: 'dB', note: 'Peak cancellation' },
      { big: '8', unit: '', note: 'Beamforming microphones' },
      { big: '268', unit: 'g', note: 'Weight, with cushions' },
    ],
    parts: materials.parts,
    partsTitle: ['Twenty-four parts,', 'no two alike.'],
    partsBody: 'Press Explode above to take One apart. Every piece has a name, a tolerance and a reason.',
    box: ['SILENTIUM One', 'Woven carry case', 'USB-C to USB-C cable, 1.2 m', '3.5 mm cable, 1.2 m', 'Flight adapter'],
    meta: 'SILENTIUM One — over-ear adaptive noise-cancelling headphones. 60 hours, −42 dB.',
  },
  buds: {
    id: 'buds',
    path: '/buds',
    index: '02',
    name: 'SILENTIUM Buds',
    short: 'Buds',
    kind: 'True wireless earbuds',
    price: 199,
    title: ['The quiet,', 'pocketable.'],
    blurb:
      'The same adaptive silence in 5.4 grams. A case you will want to hold, and a seal that stays put when you do not.',
    viewAlt:
      'SILENTIUM Buds: a rounded charging case with its lid open and two earbuds with brass details seated inside. Drag or use the arrow keys to turn the model.',
    highlights: [
      { big: '8', unit: 'h', note: 'Playback, ANC on' },
      { big: '32', unit: 'h', note: 'With the case' },
      { big: '−34', unit: 'dB', note: 'Peak cancellation' },
      { big: '5.4', unit: 'g', note: 'Per bud' },
    ],
    parts: [
      'Case base',
      'Case lid',
      'Hinge pin',
      'Case cell',
      'Charging coil',
      'Status light',
      'Bud bays',
      'Bud shell L',
      'Bud shell R',
      'Stem L',
      'Stem R',
      'Silicone tip L',
      'Silicone tip R',
      'Driver L',
      'Driver R',
      'Cell L',
      'Cell R',
      'Microphone L',
      'Microphone R',
      'Touch plate L',
      'Touch plate R',
    ],
    partsTitle: ['Twenty-one parts,', 'and a lid.'],
    partsBody: 'Press Explode above to open the case and the buds. Each piece is named; none is filler.',
    box: ['SILENTIUM Buds', 'Charging case', 'Silicone tips, four sizes', 'USB-C cable, 0.5 m'],
    meta: 'SILENTIUM Buds — true wireless adaptive noise-cancelling earbuds. 32 hours with the case.',
  },
}

export interface SpecRow {
  group: string
  label: string
  one: string
  buds: string
}

export const specRows: SpecRow[] = [
  { group: 'Sound', label: 'Driver', one: '40 mm beryllium-coated dynamic', buds: '10 mm dual-layer dynamic' },
  { group: 'Sound', label: 'Frequency response', one: '4 Hz – 40 kHz', buds: '10 Hz – 22 kHz' },
  { group: 'Sound', label: 'Spatial audio', one: 'Head-tracked', buds: 'Head-tracked' },
  { group: 'Sound', label: 'Codecs', one: 'SBC, AAC, LC3', buds: 'SBC, AAC, LC3' },
  { group: 'Silence', label: 'Peak cancellation', one: '−42 dB', buds: '−34 dB' },
  { group: 'Silence', label: 'Microphones', one: '8, beamforming', buds: '6, beamforming' },
  { group: 'Silence', label: 'Modes', one: 'Adaptive, transparency, off', buds: 'Adaptive, transparency, off' },
  { group: 'Power', label: 'Playback, ANC on', one: '60 hours', buds: '8 hours (32 with case)' },
  { group: 'Power', label: 'Quick charge', one: '5 min = 5 hours', buds: '5 min = 1 hour' },
  { group: 'Power', label: 'Charging', one: 'USB-C', buds: 'USB-C, Qi wireless' },
  { group: 'Connection', label: 'Bluetooth', one: '5.4, LE Audio', buds: '5.4, LE Audio' },
  { group: 'Connection', label: 'Multipoint', one: 'Two devices', buds: 'Two devices' },
  { group: 'Connection', label: 'Wired', one: '3.5 mm and USB-C audio', buds: 'None' },
  { group: 'Build', label: 'Weight', one: '268 g', buds: '5.4 g per bud, 42 g case' },
  { group: 'Build', label: 'Materials', one: 'Aluminium, steel, memory foam, vegan leather', buds: 'Aluminium, silicone, recycled polymer' },
  { group: 'Build', label: 'Water resistance', one: 'None', buds: 'IPX4' },
  { group: 'Build', label: 'Finishes', one: 'Basalt, Bone, Brass', buds: 'Basalt, Bone, Brass' },
]

export const specGroups = (): string[] => Array.from(new Set(specRows.map((r) => r.group)))
export const differs = (r: SpecRow) => r.one !== r.buds

export const productUi = {
  view: {
    hint: 'Drag to turn',
    hintKey: 'Arrow keys also turn it',
    group: '360° product view',
    rotate: 'Rotate',
    explode: 'Explode',
    assemble: 'Assemble',
    angle: (deg: number) => `${deg}°`,
    presets: [
      { id: 'front', label: 'Front', y: 0, x: 0.08 },
      { id: 'side', label: 'Side', y: Math.PI / 2, x: 0.08 },
      { id: 'back', label: 'Back', y: Math.PI, x: 0.08 },
      { id: 'top', label: 'Top', y: 0, x: 1.15 },
    ],
  },
  finish: 'Finish',
  add: 'Add to cart',
  compare: 'Compare',
  highlights: 'At a glance',
  anatomy: 'Anatomy',
  specs: 'Specifications',
  specsNote: 'Placeholder values for a concept brand.',
  box: 'In the box',
  other: { one: 'Looking for pocketable? Meet Buds.', buds: 'Want the full silence? Meet One.' },
  sticky: 'Added',
}

export const comparePage = {
  index: '03',
  kicker: 'Compare',
  title: ['Two ways', 'to disappear.'] as const,
  body: 'Same adaptive engine, different scale. Choose by how you carry it.',
  differences: 'Show only differences',
  all: 'Show every spec',
  choose: [
    { id: 'one' as ProductId, head: 'Choose One if', body: 'you want the deepest quiet, a day and a half of battery, and a cable for the plane.' },
    { id: 'buds' as ProductId, head: 'Choose Buds if', body: 'the room you need silent is wherever your pocket is, and weight is the enemy.' },
  ],
  tableCaption: 'SILENTIUM One and SILENTIUM Buds, specification by specification.',
  best: 'Higher',
}

export const notFound = {
  title: ['Nothing', 'here.'] as const,
  body: 'The page you wanted does not exist. That, at least, is quiet.',
  home: 'Back to SILENTIUM',
}
