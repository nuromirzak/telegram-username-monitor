import {loadTelegramVariables} from "./config";
import {TelegramService} from "./services/telegram_service";
import readline from "readline";
import {Api} from "telegram";

function generateRandomUsername(length: number = 16): string {
    const allowedCharacters: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
    const result = [];
    for (let i = 0; i < length; i++) {
        result.push(allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length)));
    }
    return result.join('');
}

async function sendMessage() {
    console.log('Sending message...');
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);
    await telegramService.start();
    const messageToSend = `Test done at ${new Date().toISOString()}`;
    await telegramService.sendMessage(messageToSend);
    await telegramService.sendMessage(messageToSend, true);
    await telegramService.stop();
}

async function createChannel() {
    console.log('Creating channel...');
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);
    await telegramService.start();
    const username = generateRandomUsername();
    const title = 'Test Channel';
    await telegramService.createChannel(username, title);
    console.log('Channel created successfully');
    await telegramService.stop();
}

async function cleanUpMessages() {
    console.log('Cleaning up messages...');
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);
    await telegramService.start();
    const client = telegramService.client;
    const me = await client.getMe();
    const messages = await client.getMessages(me, {
        limit: 500,
    });
    console.log("the total number of messages are", messages.total);
    console.log("what we got is ", messages.length);
    const messageIds = messages
        .filter((message) => message.message.includes("Username @nurma is not available yet"))
        .map((message) => message.id);
    console.log(`Found ${messageIds.length} messages to clean up`);
    await client.deleteMessages(me, messageIds, {
        revoke: true,
    });
    await telegramService.stop();
    console.log('Messages cleaned up successfully');
}

async function occupyUsername() {
    console.log('Occupying username...');
    const username = 'nrmkhd';
    const telegramVariables = await loadTelegramVariables();
    const telegramService = new TelegramService(telegramVariables);
    await telegramService.start();
    const client = telegramService.client;
    const result = await client.invoke(
        new Api.account.UpdateUsername({
            username: username,
        })
    );
    console.log('Username occupied successfully');
}

function main() {
    const asyncFunctions = [
        {name: 'Send Message', func: sendMessage},
        {name: 'Create Channel', func: createChannel},
        {name: 'Clean Up Messages', func: cleanUpMessages},
        {name: 'Occupy Username', func: occupyUsername},
    ];

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Please choose a function to execute:');
    asyncFunctions.forEach((func, index) => {
        console.log(`${index + 1}. ${func.name}`);
    });

    rl.question('Enter the number of the function to execute: ', async (answer) => {
        const choice = parseInt(answer, 10);
        if (choice > 0 && choice <= asyncFunctions.length) {
            await asyncFunctions[choice - 1].func();
        } else {
            console.log('Invalid choice.');
        }
        rl.close();
    });
}

main();
