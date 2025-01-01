import { createLogger, format, transports } from 'winston';

const logger = createLogger({
	levels: {
		error: 0,
		warn: 1,
		info: 2,
		verbose: 3,
		debug: 4,
		silly: 5,
	},
	format: format.combine(
		format.errors({ stack: true }),
		format.timestamp(),
		format.colorize(),
		format.printf(({ timestamp, level, message, stack }) => {
			return `${timestamp} [${level}]: ${stack || message}`;
		}),
	),
	transports: [
		new transports.Console({ level: 'debug' }),
		new transports.File({ filename: 'logs/bot.log', level: 'info' }),
		new transports.File({ filename: 'logs/error.log', level: 'error' }),
	],
	exceptionHandlers: [
		new transports.File({ filename: 'logs/exceptions.log' }),
	],
	rejectionHandlers: [
		new transports.File({ filename: 'logs/rejections.log' }),
	],
});

export default logger;