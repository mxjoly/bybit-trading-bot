import { SymbolInfo } from 'bybit-api';
import { decimalFloor, decimalCeil } from './math';

function getQuantityPrecision(symbolInfo: SymbolInfo) {
  return (
    symbolInfo.lot_size_filter.qty_step.toString().split('.')[1].length || 0
  );
}

export function getPositionSize(
  baseQuantity: number,
  price: number,
  symbolInfo: SymbolInfo
) {
  const minQuantity = symbolInfo.lot_size_filter.min_trading_qty;
  const quantityPrecision = getQuantityPrecision(symbolInfo);

  const quantity = baseQuantity / price;

  return quantity > minQuantity
    ? decimalFloor(quantity, quantityPrecision)
    : decimalFloor(minQuantity, quantityPrecision);
}

export function calculatePrice(
  price: number,
  percentDifference: number,
  symbolInfo: SymbolInfo
) {
  const quantityPrecision = getQuantityPrecision(symbolInfo);

  const newPrice = price * (1 + percentDifference);

  if (percentDifference >= 0) {
    return decimalFloor(newPrice, quantityPrecision);
  } else {
    return decimalCeil(newPrice, quantityPrecision);
  }
}
