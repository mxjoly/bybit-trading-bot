import { LinearClient } from 'bybit-api';

export const initBybitClient = (nodeEnv: 'development' | 'production') =>
  new LinearClient({
    key:
      nodeEnv === 'production'
        ? process.env.BYBIT_LIVENET_PUBLIC_KEY
        : process.env.BYBIT_TESTNET_PUBLIC_KEY,
    secret:
      nodeEnv === 'production'
        ? process.env.BYBIT_LIVENET_SECRET_KEY
        : process.env.BYBIT_TESTNET_SECRET_KEY,
    testnet: nodeEnv !== 'production',
  });
