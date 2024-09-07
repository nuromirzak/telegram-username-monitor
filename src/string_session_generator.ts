import {promises as fs} from 'fs';
import {config} from 'dotenv';
import * as readline from 'readline';
import {TelegramClient} from 'telegram';
import {StringSession} from 'telegram/sessions';
import {createHash} from 'crypto';
import path from "node:path";

const loadEnvVariables = (envFile: string): { apiId: number, apiHash: string, stringSession: string | null } => {
	config({path: envFile});

	const apiId = parseInt(process.env.API_ID || '', 10);
	const apiHash = process.env.API_HASH || '';
	const stringSession = process.env.STRING_SESSION || null;

	if (isNaN(apiId) || !apiHash) {
		console.error("API_ID and API_HASH must be set in the environment.");
		process.exit(1);
	}

	return {apiId, apiHash, stringSession};
};

const hashStringSession = async (stringSession: string): Promise<string> => {
	return createHash('sha256').update(stringSession).digest('hex');
};

const generateStringSession = async (apiId: number, apiHash: string): Promise<string> => {
	const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
		connectionRetries: 5,
	});

	await client.start({
		phoneNumber: async () => {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			const question = (query: string): Promise<string> => {
				return new Promise(resolve => rl.question(query, resolve));
			};

			const phone = await question("Enter your phone number: ");
			rl.close();
			return phone;
		},
		password: async () => {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			const question = (query: string): Promise<string> => {
				return new Promise(resolve => rl.question(query, resolve));
			};

			const password = await question("Enter your password: ");
			rl.close();
			return password;
		},
		phoneCode: async () => {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			const question = (query: string): Promise<string> => {
				return new Promise(resolve => rl.question(query, resolve));
			};

			const code = await question("Enter the code you received: ");
			rl.close();
			return code;
		},
		onError: (err: any) => console.log(err),
	});

	const newSessionString = client.session.save() as unknown as string;
	console.log("Generated new string session:", await hashStringSession(newSessionString));

	await client.disconnect();

	return newSessionString;
};

const main = async () => {
	console.log("Loading environment variables from .env file.", __dirname);
	const envFileName = path.resolve(__dirname, '../.env');
	let {apiId, apiHash, stringSession} = loadEnvVariables(envFileName);

	let session = stringSession;
	if (!session) {
		console.log("No string session found. Generating a new one.");
		session = await generateStringSession(apiId, apiHash);
		await fs.appendFile(envFileName, `\nSTRING_SESSION=${session}`);
	} else {
		console.log("Existing string session found.");
		console.log("Hash:", await hashStringSession(session));
	}

	const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
		connectionRetries: 5,
	});

	await client.start({
		phoneNumber: async () => '', // Provide phone number function if needed
		phoneCode: async () => '', // Provide phone code function if needed
		onError: (err) => console.error(err),
	});

	if (!await client.isUserAuthorized()) {
		console.log("User not authorized. Please authorize the session.");
	} else {
		console.log("User is authorized.");
	}

	await client.disconnect();
};

main();
