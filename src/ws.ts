import { WebsocketClientOptions } from 'bybit-api';

export const getWsConfig = (
  nodeEnv: 'production' | 'development'
): WebsocketClientOptions => ({
  key:
    nodeEnv === 'production'
      ? process.env.BYBIT_LIVENET_PUBLIC_KEY
      : process.env.BYBIT_TESTNET_PUBLIC_KEY,
  secret:
    nodeEnv === 'production'
      ? process.env.BYBIT_LIVENET_SECRET_KEY
      : process.env.BYBIT_TESTNET_SECRET_KEY,

  /*
    The following parameters are optional:
  */

  // defaults to false == testnet. Set to true for livenet.
  testnet: nodeEnv !== 'production',

  // NOTE: to listen to multiple markets (spot vs inverse vs linear vs linearfutures) at once, make one WebsocketClient instance per market

  // defaults to inverse:
  // market: 'inverse'
  market: 'linear',
  // market: 'spot'

  // how long to wait (in ms) before deciding the connection should be terminated & reconnected
  pongTimeout: 1000,

  // how often to check (in ms) that WS connection is still alive
  pingInterval: 10000,

  // how long to wait before attempting to reconnect (in ms) after connection is closed
  reconnectTimeout: 500,

  // config options sent to RestClient (used for time sync). See RestClient docs.
  restOptions: {},

  // config for axios used for HTTP requests. E.g for proxy support
  // requestOptions: {},

  // override which URL to use for websocket connections
  // wsUrl: 'wss://stream.bytick.com/realtime'
});

export const getWsLogger = (): {
  debug: (param: string) => void;
  error: (param: string) => null;
  info: (param: string) => null;
  notice: (param: string) => null;
  silly: (param: string) => null;
  warning: (param: string) => null;
} => ({
  debug: () => null,
  error: () => null,
  info: () => null,
  notice: () => null,
  silly: () => null,
  warning: () => null,
});
