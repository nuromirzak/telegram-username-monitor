import {ScheduledHandler} from "aws-lambda";
import {UsernameCheckLog} from "../types";
import {loadTelegramVariables, typedConfig} from "../config";
import {TelegramService} from "../services/telegram_service";
import {UsernameMonitorLogService} from "../services/username_monitor_log_service";

async function notifyWatcherAboutUsername(
    username: string,
    telegramService: TelegramService,
    available = false,
): Promise<void> {
    const message = available
        ? `Username @${username} is available!`
        : `Username @${username} is not available yet.`;
    await telegramService.sendMessage(message, available);
}

async function occupyUsername(
    username: string,
    telegramService: TelegramService,
): Promise<void> {
    try {
        await telegramService.createChannel(username, "Occupied");
        await telegramService.sendMessage(`Channel @${username} created.`);
    } catch (error) {
        console.error(`Error while creating channel @${username}:`, error);
        await telegramService.sendMessage(`Error while creating channel @${username}.`);
    }
}

async function checkUsername(
    username: string,
    telegramService: TelegramService,
): Promise<UsernameCheckLog> {
    const usernameCheckLog: UsernameCheckLog = {
        username,
        result: false,
        date: new Date().getTime(),
        error: null,
    };

    try {
        usernameCheckLog.result = await telegramService.checkUsername(username);
        await notifyWatcherAboutUsername(username, telegramService, usernameCheckLog.result);

        if (usernameCheckLog.result) {
            await occupyUsername(username, telegramService);
        }
    } catch (error) {
        usernameCheckLog.error = error instanceof Error ? error.message : String(error);
    }

    return usernameCheckLog;
}

export const handler: ScheduledHandler = async (_event) => {
    const usernameMonitorLogTableName = process.env.USERNAME_MONITOR_LOG_TABLE_NAME;
    if (!usernameMonitorLogTableName) {
        throw new Error('USERNAME_CHECK_LOG_TABLE_NAME is not set');
    }

    const usernameCheckLogService = new UsernameMonitorLogService(usernameMonitorLogTableName);
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);

    await telegramService.start();

    try {
        const uniqueUsernames = [...new Set(typedConfig.usernames)];

        const usernameCheckLogs = await Promise.all(
            uniqueUsernames.map(username => checkUsername(username, telegramService))
        );

        await usernameCheckLogService.createUsernameCheckLogs(usernameCheckLogs);
    } finally {
        await telegramService.stop();
    }
}
