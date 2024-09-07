import {Api, TelegramClient} from "telegram";
import {TelethonVariables} from "../types";
import {StringSession} from "telegram/sessions";
import {LogLevel} from "telegram/extensions/Logger";

export class TelegramService {
    client: TelegramClient;

    constructor(telethonVariables: TelethonVariables) {
        const session = new StringSession(telethonVariables.SESSION_STRING);
        this.client = new TelegramClient(session, telethonVariables.API_ID, telethonVariables.API_HASH, {
            connectionRetries: 1,
            requestRetries: 1,
            floodSleepThreshold: 0,
        });
        this.client.setLogLevel(LogLevel.NONE);
    }

    async start() {
        return await this.client.start({
            phoneNumber: async () => '', // Provide phone number function if needed
            phoneCode: async () => '', // Provide phone code function if needed
            onError: (err) => console.error(err),
        });
    }

    async stop() {
        return await this.client.disconnect();
    }

    async checkUsername(username: string): Promise<boolean> {
        return await this.client.invoke(new Api.account.CheckUsername({username}));
    }

    async sendMessage(message: string, scheduled: boolean = false) {
        const me = await this.client.getMe();
        const username = me.username;
        if (!username) {
            throw new Error('Failed to get username');
        }
        return await this.client.sendMessage(username, {
            message,
            schedule: scheduled ? this.#getDelayedDate() : undefined,
        });
    }

    #getDelayedDate(delaySeconds: number = 30): number {
        const now = Math.floor(Date.now() / 1000);
        return now + delaySeconds;
    }

    async createChannel(username: string, title: string) {
        const result = await this.client.invoke(
            new Api.channels.CreateChannel({
                title,
                about: 'Test Channel Description',
                broadcast: true,
                megagroup: false,
            })
        );

        let channelId: bigInt.BigInteger | null = null;
        if (result.className === 'Updates' && result.chats.length > 0) {
            channelId = result.chats[0].id;
        }
        if (!channelId) {
            throw new Error('Channel id not found');
        }

        await this.client.invoke(
            new Api.channels.UpdateUsername({
                channel: channelId,
                username: username,
            })
        );
    }
}
