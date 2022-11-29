import { MACD, CrossUp } from 'technicalindicators';

/**
 * Return true if it's a buy signal
 * @param candles
 */
export function macdStrategy(candles: Candle[]) {
  const macd = MACD.calculate({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    values: candles.map((c) => c.close),
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const results = CrossUp.calculate({
    lineA: macd.map((a) => a.MACD),
    lineB: macd.map((a) => a.signal),
  });

  return results[results.length - 1] && macd.slice(-1)[0].signal < 0;
}
