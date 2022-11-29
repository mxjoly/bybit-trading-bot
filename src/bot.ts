import { LinearClient, SymbolInfo, WebsocketClient } from 'bybit-api';
import dayjs from 'dayjs';
import { intervalToMinutes } from './utils/interval';
import { error, log } from './utils/log';
import { calculatePrice, getPositionSize } from './utils/symbol';
import { getWsConfig, getWsLogger } from './ws';
import { decimalFloor } from './utils/math';
import { sendTelegramMessage } from './utils/telegram';
import { macdStrategy } from './strategy';

class Bot {
  private client: LinearClient;
  private symbolInfos: { [symbol: string]: SymbolInfo };
  private candleSockets: { [symbol: string]: WebsocketClient }; // candle sockets
  private orderSocket: WebsocketClient;
  private config: BotConfig;

  // Time
  private currentDay: string;
  private currentMonth: string;
  private lastDayBalance: number;
  private lastMonthBalance: number;
  private currentBalance: number; // temp balance

  constructor(client: LinearClient, config: BotConfig) {
    this.client = client;
    this.config = config;
    this.candleSockets = {};
    this.symbolInfos = {};
    this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
    this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
  }

  public async prepare() {
    this.config.assets.forEach((asset) => {
      const symbol = asset + this.config.base;
      this.client.setPositionMode({ symbol, mode: 'BothSide' });
      this.client.setPositionTpSlMode({ symbol, tp_sl_mode: 'Full' });
      this.client.setMarginSwitch({
        symbol,
        is_isolated: false,
        buy_leverage: this.config.leverage,
        sell_leverage: this.config.leverage,
      });
    });

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
    // Store account information to local
    this.currentBalance = Number(
      (await this.client.getWalletBalance()).result[this.config.base]
        .wallet_balance
    );
    this.lastMonthBalance = this.currentBalance;
    this.lastDayBalance = this.currentBalance;

    Object.entries(this.candleSockets).forEach(([symbol, socket]) => {
      socket.on('update', (data) => {
        const candle = data.data[0] as WebsocketCandle; // 0: previous confirm candle, 1: current candle

        if (/^candle.[0-9DWM]+.[A-Z]+USDT$/g.test(data.topic)) {
          this.onCandleChange(symbol, candle);
        }

        // Day change ?
        let candleDay = dayjs(new Date(candle.start * 1000)).format(
          'DD/MM/YYYY'
        );
        if (candleDay !== this.currentDay) {
          this.sendDailyResult();
          this.currentDay = candleDay;
        }

        // Month change ?
        let candleMonth = dayjs(new Date(candle.start * 1000)).format(
          'MM/YYYY'
        );
        if (candleMonth !== this.currentMonth) {
          this.sendMonthResult();
          this.currentMonth = candleMonth;
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

  private async loadCandles(symbol: string, interval: Interval) {
    const minutes = intervalToMinutes(interval);
    const limit = 200; // api limit
    const data = await this.client.getKline({
      symbol,
      interval: this.config.interval,
      from: Math.round(
        dayjs()
          .subtract(minutes * limit, 'minutes')
          .valueOf() / 1000
      ),
      limit,
    });
    const candles: Candle[] = data.result.slice(0, data.result.length - 1);
    return candles;
  }

  private async onCandleChange(symbol: string, lastCandle: WebsocketCandle) {
    const bothSidePosition = await this.client.getPosition({
      symbol,
    }); // 0: Buy side 1: Sell side
    const activeOrders = await this.client.queryActiveOrder({
      symbol,
    });
    const candles = await this.loadCandles(symbol, this.config.interval);

    const balance = (await this.client.getWalletBalance()).result[
      this.config.base
    ];

    const position = bothSidePosition.result[0];
    const hasPosition = position.position_margin > 0;

    // ===================== Buy Strategy ===================== //
    const buy = macdStrategy(candles);
    // const buy = true;
    // ======================================================== //

    if (buy && !hasPosition && activeOrders.result.length === 0) {
      const quantity = getPositionSize(
        this.config.initial_margin_position *
          balance.wallet_balance *
          this.config.leverage,
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

  private async onExecutionOrder(order: WebsocketOrder[]) {
    const balance = (await this.client.getWalletBalance()).result[
      this.config.base
    ];

    const positions = await this.client.getPosition({
      symbol: order[0].symbol,
    });

    const position = positions.result[0]; // 0: buy side 1: Sell side

    const initialMargin =
      (position.size * position.entry_price) / this.config.leverage;
    const maxMargin =
      this.config.max_margin_position *
      balance.wallet_balance *
      this.config.leverage;

    // Buy order is activated
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

      if (initialMargin < maxMargin) {
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
      }
    } else {
      // Update the current balance
      this.currentBalance = Number(
        (await this.client.getWalletBalance()).result[this.config.base]
          .wallet_balance
      );
      log(`TP reach on ${order[0].symbol}`);
      this.client.cancelAllActiveOrders({ symbol: position.symbol });
    }
  }

  private sendDailyResult() {
    let performance = decimalFloor(
      ((this.currentBalance - this.lastDayBalance) / this.lastDayBalance) * 100,
      2
    );

    let emoji = performance >= 0 ? '🟢' : '🔴';
    let message = `Day result of ${this.currentDay}: ${
      performance > 0 ? `<b>+${performance}%</b>` : `${performance}%`
    } ${emoji}`;

    sendTelegramMessage(message);
  }

  private sendMonthResult() {
    let performance = decimalFloor(
      ((this.currentBalance - this.lastMonthBalance) / this.lastMonthBalance) *
        100,
      2
    );

    let emoji =
      performance > 30
        ? '🤩'
        : performance > 20
        ? '🤑'
        : performance > 10
        ? '😍'
        : performance > 0
        ? '🥰'
        : performance > -10
        ? '😢'
        : performance > -20
        ? '😰'
        : '😭';

    let message =
      `<b>MONTH RESULT - ${this.currentMonth}</b>` +
      '\n' +
      `${performance > 0 ? `+${performance}%` : `${performance}%`} ${emoji}`;

    sendTelegramMessage(message);
  }
}

export default Bot;
