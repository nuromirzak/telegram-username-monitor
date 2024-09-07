import {z} from "zod";

export type TelethonVariables = {
	API_ID: number;
	API_HASH: string;
	SESSION_STRING: string;
};

export const usernameMonitorLogSchema = z.object({
	username: z.string(),
	date: z.number(),
	result: z.boolean(),
	error: z.string().nullable(),
}).strict();
export type UsernameCheckLog = z.infer<typeof usernameMonitorLogSchema>;

export const configSchema = z.object({
	usernames: z.array(z.string()),
	checkIntervalMinutes: z.number(),
}).strict();
export type Config = z.infer<typeof configSchema>;

