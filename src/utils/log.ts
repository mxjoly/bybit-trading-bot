import dayjs from 'dayjs';
import chalk from 'chalk';
import { Logger } from '../init';

/**
 * Main function add a log
 * @param message
 * @param date
 */
export function log(message: string, date = Date.now()) {
  const logDate = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  Logger.info(`${logDate} : ${message}`);
  console.log(`${chalk.blue(logDate)} : ${message}`);
}

/**
 * Main function add an error in the logs
 * @param message
 * @param date
 */
export function error(message: string, date = Date.now()) {
  const logDate = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  Logger.warn(`${logDate} : ${message}`);
  console.log(`${chalk.blue(logDate)} : ${message}`);
}
