import { LinearClient, WebsocketClient } from 'bybit-api';
import { getWsConfig, getWsLogger } from './ws';

class Bot {
  private client: LinearClient;
  private candleSockets: WebsocketClient[]; // candle sockets
  private orderSocket: WebsocketClient;
  private config: BotConfig;

  constructor(client: LinearClient, config: BotConfig) {
    this.client = client;
    this.config = config;
  }

  prepare() {
    this.config.assets.forEach((asset) => {
      const symbol = asset + this.config.base;
      this.client.setPositionMode({ symbol, mode: 'BothSide' });
      this.client.setUserLeverage({
        symbol,
        buy_leverage: this.config.leverage,
        sell_leverage: this.config.leverage,
      });
      this.client.setPositionTpSlMode({ symbol, tp_sl_mode: 'Full' });
    });

    this.candleSockets = this.config.assets.map((asset) => {
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

      return ws;
    });

    this.orderSocket = new WebsocketClient(
      getWsConfig(process.env.NODE_ENV as any),
      getWsLogger()
    );

    this.orderSocket.subscribe('order');

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

  run() {
    this.candleSockets.forEach((socket) => {
      socket.on('update', (data) => {
        if (/^candle.[0-9DWM]+.[A-Z]+USDT$/g.test(data.topic)) {
          const symbol = data.topic.split('.').slice(-1)[0];
          const candle = data.data as Candle;
          this.onCandleChange(symbol, candle);
        }
      });
    });

    this.orderSocket.on('update', (data) => {
      const symbol = data.data.symbol;
      this.onOrder(symbol);
    });
  }

  stop() {}

  private onCandleChange(symbol: string, lastCandle: Candle) {}

  private onOrder(symbol: string) {}
}

export default Bot;
