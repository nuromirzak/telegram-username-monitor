import {ScheduledHandler} from "aws-lambda";
import {UsernameCheckLog} from "../types";
import {loadTelegramVariables} from "../config";
import {UsernameService} from "../services/username_service";
import {TelegramService} from "../services/telegram_service";
import {UsernameCheckLogService} from "../services/uesrname_check_log_service";

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
    const usernameCheckLogTableName = process.env.USERNAME_CHECK_LOG_TABLE_NAME;
    const usernameTable = process.env.USERNAME_TABLE_NAME;
    if (!usernameCheckLogTableName || !usernameTable) {
        throw new Error('USERNAME_CHECK_LOG_TABLE_NAME or USERNAME_TABLE_NAME is not set');
    }

    const usernameService = new UsernameService(usernameTable);
    const usernameCheckLogService = new UsernameCheckLogService(usernameCheckLogTableName);
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);

    await telegramService.start();

    try {
        const trackedUsernames = await usernameService.getUsernames();
        const uniqueUsernames = [...new Set(trackedUsernames.map(({username}) => username))];

        const usernameCheckLogs = await Promise.all(
            uniqueUsernames.map(username => checkUsername(username, telegramService))
        );

        await usernameCheckLogService.createUsernameCheckLogs(usernameCheckLogs);
    } finally {
        await telegramService.stop();
    }
}
