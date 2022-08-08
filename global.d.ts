interface BotConfig {
  base: string;
  assets: string[];
  max_margin_position: number;
  initial_margin_position: number;
  leverage: number;
  take_profit_percent: number;
  repurchase_percent_delta: number;
}

interface Candle {
  start: number;
  end: number;
  period: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: string;
  turnover: string;
  confirm: boolean;
  cross_seq: number;
  timestamp: number;
}

interface Order {
  symbol: string;
}
