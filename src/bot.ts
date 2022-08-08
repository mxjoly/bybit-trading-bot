import { LinearClient, SymbolInfo, WebsocketClient } from 'bybit-api';
import { error, log } from './utils/log';
import { calculatePrice, getPositionSize } from './utils/symbol';
import { getWsConfig, getWsLogger } from './ws';

class Bot {
  private client: LinearClient;
  private symbolInfos: { [symbol: string]: SymbolInfo };
  private candleSockets: { [symbol: string]: WebsocketClient }; // candle sockets
  private orderSocket: WebsocketClient;
  private config: BotConfig;

  constructor(client: LinearClient, config: BotConfig) {
    this.client = client;
    this.config = config;
  }

  public async prepare() {
    this.config.assets.forEach((asset) => {
      const symbol = asset + this.config.base;
      this.client.setPositionMode({ symbol, mode: 'BothSide' });
      this.client.setPositionTpSlMode({ symbol, tp_sl_mode: 'Full' });
      this.client.setMarginSwitch({
        symbol,
        is_isolated: true,
        buy_leverage: this.config.leverage,
        sell_leverage: this.config.leverage,
      });
    });

    this.candleSockets = {};
    this.symbolInfos = {};

    const allInfos = await this.client.getSymbols();
    this.config.assets.forEach((asset) => {
      const symbol = asset + this.config.base;
      this.symbolInfos[symbol] = allInfos.result.find(
        (info) => info.name === symbol
      );
    });

    this.config.assets.map((asset) => {
      const symbol = asset + this.config.base;
      const ws = new WebsocketClient(
        getWsConfig(process.env.NODE_ENV as any),
        getWsLogger()
      );

      // and/or subscribe to individual topics on demand
      ws.subscribe(`candle.1.${symbol}`);

      ws.on('open', ({ wsKey, event }) => {
        console.log(`Connection open with ${symbol}`);
      });

      ws.on('close', () => {
        console.log(`Connection closed with ${symbol}`);
      });

      ws.on('error', (err) => {
        console.error(err);
      });

      this.candleSockets[symbol] = ws;
    });

    this.orderSocket = new WebsocketClient(
      getWsConfig(process.env.NODE_ENV as any),
      getWsLogger()
    );

    this.orderSocket.subscribe('execution');

    this.orderSocket.on('open', ({ wsKey, event }) => {
      console.log(`Connection open with order`);
    });

    this.orderSocket.on('close', () => {
      console.log(`Connection closed with order`);
    });

    this.orderSocket.on('error', (err) => {
      console.error(err);
    });
  }

  public async run() {
    Object.entries(this.candleSockets).forEach(([symbol, socket]) => {
      socket.on('update', (data) => {
        if (/^candle.[0-9DWM]+.[A-Z]+USDT$/g.test(data.topic)) {
          const candle = data.data[0] as Candle; // 0: previous confirm candle, 1: current candle
          this.onCandleChange(symbol, candle);
        }
      });
    });

    this.orderSocket.on('update', (data) => {
      const order = data.data;
      this.onExecutionOrder(order);
    });
  }

  public stop() {
    Object.entries(this.candleSockets).forEach(([symbol, socket]) => {
      socket.unsubscribe(`candle.1.${symbol}`);
    });
    this.orderSocket.unsubscribe('order');
  }

  private async onCandleChange(symbol: string, lastCandle: Candle) {
    const bothSidePosition = await this.client.getPosition({
      symbol,
    }); // 0: Buy side 1: Sell side
    const activeOrders = await this.client.queryActiveOrder({
      symbol,
    });

    const position = bothSidePosition.result[0];
    const hasPosition = position.position_margin > 0;
    const buy = true;

    if (buy && !hasPosition && activeOrders.result.length === 0) {
      const quantity = getPositionSize(
        this.config.initial_margin_position,
        lastCandle.close,
        this.symbolInfos[symbol]
      );

      this.client
        .placeActiveOrder({
          symbol,
          order_type: 'Limit',
          side: 'Buy',
          price: lastCandle.close,
          qty: quantity,
          reduce_only: false,
          close_on_trigger: false,
          time_in_force: 'GoodTillCancel',
          position_idx: 1,
        })
        .then((res) => {
          log(`Buy ${quantity}${symbol} at ${lastCandle.close}`);
        })
        .catch(error);
    }
  }

  private async onExecutionOrder(order: Order[]) {
    const positions = await this.client.getPosition({
      symbol: order[0].symbol,
    });
    const activeOrders = await this.client.queryActiveOrder({
      symbol: order[0].symbol,
    });

    const position = positions.result[0]; // 0: buy side 1: Sell side

    if (position.position_margin > 0) {
      this.client.cancelAllActiveOrders({ symbol: position.symbol });

      const tp = calculatePrice(
        position.entry_price,
        this.config.take_profit_percent,
        this.symbolInfos[position.symbol]
      );
      const repurchase = calculatePrice(
        position.entry_price,
        -this.config.repurchase_percent_delta,
        this.symbolInfos[position.symbol]
      );
      // TP order
      this.client
        .placeActiveOrder({
          symbol: position.symbol,
          order_type: 'Limit',
          side: 'Sell',
          price: tp,
          qty: position.size,
          reduce_only: false,
          close_on_trigger: false,
          time_in_force: 'GoodTillCancel',
          position_idx: 1,
        })
        .then(() => {
          log(`Create Sell limit ${position.size}${position.symbol} at ${tp}`);
        })
        .catch(error);
      // Repurchase order
      this.client
        .placeActiveOrder({
          symbol: position.symbol,
          order_type: 'Limit',
          side: 'Buy',
          price: repurchase,
          qty: position.size,
          reduce_only: false,
          close_on_trigger: false,
          time_in_force: 'GoodTillCancel',
          position_idx: 1,
        })
        .then(() => {
          log(
            `Create Buy limit ${position.size}${position.symbol} at ${repurchase}`
          );
        })
        .catch(error);
    } else {
      this.client.cancelAllActiveOrders({ symbol: position.symbol });
    }
  }
}

export default Bot;
