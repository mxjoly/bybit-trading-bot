/**
 * Get the minutes in a time frame
 * @param timeFrame
 */
export function intervalToMinutes(timeFrame: Interval) {
  if (timeFrame === 'D') {
    return 60 * 24;
  } else if (timeFrame === 'W') {
    return 60 * 24 * 7;
  } else if (timeFrame === 'M') {
    return 60 * 24 * 7 * 30;
  } else {
    return parseInt(timeFrame);
  }
}
