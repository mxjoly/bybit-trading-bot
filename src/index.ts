import { BybitClient, BotConfig } from './init';
import Bot from './bot';

const tradingBot = new Bot(BybitClient, BotConfig);
tradingBot.prepare().then(() => {
  tradingBot.run();
});
