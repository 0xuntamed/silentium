/**
 * ALL site copy lives here so it is easy to swap.
 * PLACEHOLDER: spec numbers, price, names of finishes and every review below are fictional.
 */
export const brand = {
  name: 'SILENTIUM',
  tagline: ['Hear only what', 'matters.'] as const, // second line is the italic emphasis
}

export const nav = {
  links: [
    { label: 'Silence', scene: 'anc' },
    { label: 'Space', scene: 'spatial' },
    { label: 'Craft', scene: 'materials' },
    { label: 'Numbers', scene: 'specs' },
    { label: 'Voices', scene: 'reviews' },
  ],
  cart: 'Cart',
}

export const intro = {
  line: 'Put them on.',
  hint: 'Hold, click or scroll',
  enter: 'Enter SILENTIUM',
  soundOff: 'Sound off',
  soundOn: 'Sound on',
}

export const hero = {
  product: 'SILENTIUM One',
  kind: 'Over-ear · Adaptive ANC',
  sub: 'Noise cancellation that listens to the room you are actually in — then makes it disappear.',
  callouts: [
    { k: 'Driver', v: '40 mm' },
    { k: 'Microphones', v: '8' },
    { k: 'Cancellation', v: 'Adaptive' },
  ],
  cue: 'Scroll',
}

export const anc = {
  index: '02',
  label: 'Adaptive silence',
  noise: {
    title: 'Eighty-six decibels of everyone else.',
    body: 'Engines, chatter, sirens. The city does not ask.',
  },
  listen: {
    title: 'Eight microphones listen. One field answers.',
    body: 'SILENTIUM samples the room 48,000 times a second and answers in antiphase. Music passes through. The rest does not.',
  },
  reveal: { big: '−42 dB.', small: 'The world, on mute.' },
  meter: { label: 'Ambient level', unit: 'dB', off: 'ANC off', on: 'ANC on' },
  noiseWords: ['HONK', 'CHATTER', 'ENGINE', 'SIREN'],
}

export const spatial = {
  index: '03',
  label: 'Spatial audio',
  title: ['Sound has a', 'place.'] as const,
  body: 'Head-tracked spatial audio holds every instrument exactly where the mix put it — even when you turn your head.',
  hint: 'Move your cursor. Place the sound.',
  hintTouch: 'Tap anywhere. Place the sound.',
  audioOff: 'Turn sound on — best with headphones.',
  audioOn: 'Sound on — you are hearing it in 3D.',
  readout: [
    { k: 'Azimuth', v: '37°' },
    { k: 'Distance', v: '1.2 m' },
    { k: 'L', v: '−4.1 dB' },
    { k: 'R', v: '−1.8 dB' },
  ],
}

export const materials = {
  index: '04',
  label: 'Craft',
  title: ['Twenty-four parts.', 'One intention.'] as const,
  body: 'Machined aluminium yokes. Protein-leather cushions over slow-recovery memory foam. A beryllium-coated driver, tuned by ear.',
  finishes: ['Basalt', 'Bone', 'Brass'],
  finishNote: 'Choose a finish',
  materialsList: [
    { k: 'Frame', v: 'Machined aluminium' },
    { k: 'Cushion', v: 'Protein leather, memory foam' },
    { k: 'Driver', v: 'Beryllium-coated, 40 mm' },
  ],
  parts: [
    'Headband shell', 'Headband pad', 'Spring slider L', 'Spring slider R',
    'Yoke L', 'Yoke R', 'Cup shell L', 'Cup shell R',
    'Cushion L', 'Cushion R', 'Driver L', 'Driver R',
    'Magnet L', 'Magnet R', 'Board L', 'Board R',
    'Battery', 'Mic port ×8', 'Hinge pin ×4', 'Grille L',
    'Grille R', 'Touch plate', 'Seal ring L', 'Seal ring R',
  ],
}

export const specs = {
  index: '05',
  label: 'The numbers',
  title: ['Everything else', 'is a rounding error.'] as const,
  matrixLabel: 'Playback · ANC on · full charge',
  items: [
    { big: '60', unit: 'h', note: 'Playback, ANC on' },
    { big: '−42', unit: 'dB', note: 'Peak cancellation' },
    { big: '40', unit: 'mm', note: 'Beryllium-coated driver' },
    { big: '8', unit: '', note: 'Beamforming microphones' },
    { big: '5', unit: 'min', note: 'Charge = 5 hours' },
    { big: 'LE', unit: 'Audio', note: 'Bluetooth 5.4, multipoint' },
  ],
}

export const reviews = {
  index: '06',
  label: 'Listener notes',
  title: ['The quiet,', 'reviewed.'] as const,
  note: 'Placeholder copy — fictional listeners.',
  railLabel: 'Listener notes. Drag, or use the left and right arrow keys, to browse.',
  items: [
    { quote: 'The first time the room went away I took them off to check. It had not.', who: 'A. Marlow', role: 'Sound editor', rating: 5 },
    { quote: 'Quiet without the pressure. Music arrives like it was already there.', who: 'J. Okafor', role: 'Commuter', rating: 5 },
    { quote: 'Engineered like a watch. Sounds like nothing in the way.', who: 'R. Lindqvist', role: 'Mastering engineer', rating: 5 },
    { quote: 'I stopped noticing the flight. Then I noticed I had stopped noticing.', who: 'S. Varga', role: 'Frequent flyer', rating: 5 },
    { quote: 'The spatial mode finds the room in a mix I have heard a thousand times.', who: 'T. Nakamura', role: 'Producer', rating: 5 },
    { quote: 'Brass finish, leather that ages well, a click that feels like it cost something.', who: 'E. Dubois', role: 'Product designer', rating: 4 },
  ],
}

export const cta = {
  index: '07',
  title: ['Hear only what', 'matters.'] as const,
  primary: 'Shop SILENTIUM One',
  price: 'From $449',
  secondary: 'Add Buds',
  secondaryPrice: '$199',
}

export const newsletter = {
  title: 'Quiet letters, rarely.',
  body: 'New finishes, firmware, and the occasional silence. No more than one a month.',
  label: 'Email address',
  placeholder: 'you@example.com',
  submit: 'Subscribe',
  invalid: 'That does not look like an email address.',
  done: 'Thank you. The next letter finds you quietly.',
  demo: 'Demo only: nothing is sent or stored.',
}

export const cart = {
  title: 'Your cart',
  empty: 'Nothing here yet. Silence is free; the rest is $449.',
  close: 'Close cart',
  subtotal: 'Subtotal',
  checkout: 'Checkout',
  demo: 'This is a concept site: checkout is not connected.',
  remove: 'Remove',
  finish: 'Finish',
}

export const menu = { open: 'Menu', close: 'Close', label: 'Main menu' }

export const footer = {
  line: 'SILENTIUM — Quiet, by design.',
  top: 'Back to top',
  fine: '© 2026 SILENTIUM. A concept brand; all names, specs and reviews are placeholders.',
}
