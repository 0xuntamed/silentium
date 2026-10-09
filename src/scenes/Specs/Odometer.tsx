/**
 * Rolling numerals. Each digit is a column holding a strip of 0–9; the Specs timeline rolls the strip
 * (a `yPercent` tween — transform only). The strip is rendered already at its final digit, so with
 * reduced motion (no timeline) the number simply reads correctly.
 */
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Odometer({ value }: { value: string }) {
  return (
    <span className="inline-flex">
      <span className="sr-only">{value}</span>
      {[...value].map((ch, i) => {
        const d = /\d/.test(ch) ? Number(ch) : -1
        if (d < 0) {
          return (
            <span key={i} aria-hidden className="inline-block h-[1.04em] leading-[1.04]">
              {ch}
            </span>
          )
        }
        return (
          <span key={i} data-odo-col aria-hidden className="relative inline-block h-[1.04em] overflow-hidden align-top leading-[1.04]">
            <span data-odo-strip data-digit={d} className="block will-change-transform" style={{ transform: `translateY(${-d * 10}%)` }}>
              {DIGITS.map((n) => (
                <span key={n} className="block h-[1.04em]">
                  {n}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
