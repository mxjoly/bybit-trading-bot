import TelegramBot from 'node-telegram-bot-api';
import { log } from '../utils/log';
import { TelegramBot as Bot } from '../init';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!CHAT_ID) {
  console.error(
    'You must set up the environment variable TELEGRAM_CHAT_ID to use the Telegram bot'
  );
  process.exit(1);
}

export function sendTelegramMessage(message: string) {
  return new Promise<TelegramBot.Message>((resolve, reject) => {
    Bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' })
      .then((messageInfo) => {
        if (process.env.NODE_ENV === 'test') {
          Bot.deleteMessage(
            messageInfo.chat.id,
            String(messageInfo.message_id)
          );
        }

        log(`Telegram message send successfully`);
        resolve(messageInfo);
      })
      .catch(reject);
  });
}
