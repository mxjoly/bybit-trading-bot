interface BotConfig {
  base: string;
  assets: string[];
  max_margin_position: number;
  initial_margin_position: number;
  leverage: number;
  take_profit_percent: number;
  repurchase_percent_delta: number;
  interval: Interval;
}

interface WebsocketCandle {
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

interface WebsocketOrder {
  order_id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Limit' | 'Market';
  price: number;
  qty: number;
  leaves_qty: number;
  last_exec_price: number;
  cum_exec_qty: number;
  cum_exec_value: number;
  cum_exec_fee: number;
  time_in_force:
    | 'GoodTillCancel'
    | 'ImmediateOrCancel'
    | 'FillOrKill'
    | 'PostOnly';
  create_type: string;
  cancel_type: string;
  order_status:
    | 'Created'
    | 'New'
    | 'Rejected'
    | 'PartiallyFilled'
    | 'Filled'
    | 'PendingCancel'
    | 'Cancelled'
    | 'Untriggered'
    | 'Deactivated'
    | 'Triggered'
    | 'Active';
  take_profit: number;
  stop_loss: number;
  trailing_stop: number;
  create_time: string;
  update_time: string;
  reduce_only: boolean;
  close_on_trigger: boolean;
  position_idx: '0' | '1' | '2';
}

interface Candle {
  id: number;
  symbol: string;
  period: Interval;
  interval: Interval;
  start_at: number; // timestamp in seconds
  open_time: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  turnover: number;
}

type Interval =
  | '1'
  | '3'
  | '5'
  | '15'
  | '30'
  | '60'
  | '120'
  | '240'
  | '360'
  | '720'
  | 'D'
  | 'M'
  | 'W';
