/**
 * Math.ceil with decimals
 * @param x
 * @param precision - The number of digits
 */
export function decimalCeil(x: number, precision: number) {
  const n = 10 ** precision;
  return Math.ceil(x * n) / n;
}

/**
 * Math.floor with decimals
 * @param x
 * @param precision - The number of digits
 */
export function decimalFloor(x: number, precision: number) {
  const n = 10 ** precision;
  return Math.floor(x * n) / n;
}

/**
 * Math.round with decimals
 * @param x
 * @param precision - The number of digits
 */
export function decimalRound(x: number, precision: number) {
  const n = 10 ** precision;
  return Math.round(x * n) / n;
}
