/** A pragmatic email check for the demo newsletter field: something@something.tld, no spaces. */
export function isEmail(value: string): boolean {
  const v = value.trim()
  if (v.length < 5 || v.length > 254) return false
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)
}
