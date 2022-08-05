import { LinearClient } from 'bybit-api';

export const initBybitClient = (nodeEnv: 'development' | 'production') =>
  new LinearClient(
    nodeEnv === 'production'
      ? process.env.BYBIT_LIVENET_PUBLIC_KEY
      : process.env.BYBIT_TESTNET_PUBLIC_KEY,
    nodeEnv === 'production'
      ? process.env.BYBIT_LIVENET_SECRET_KEY
      : process.env.BYBIT_TESTNET_SECRET_KEY,
    nodeEnv === 'production'
  );
