import {z} from "zod";

export type TelethonVariables = {
    TELETHON_API_ID: number;
    TELETHON_API_HASH: string;
    TELETHON_SESSION_STRING: string;
};

export const addUsernameRequestSchema = z.object({
    username: z.string(),
    watcher: z.string(),
}).strict();
export type AddUsernameRequest = z.infer<typeof addUsernameRequestSchema>;

export const usernameCheckLogSchema = z.object({
    username: z.string(),
    date: z.number(),
    result: z.boolean(),
    error: z.string().nullable(),
}).strict();
export type UsernameCheckLog = z.infer<typeof usernameCheckLogSchema>;

export const usernameSchema = z.object({
    username: z.string(),
    watcher: z.string(),
}).strict();
export type Username = z.infer<typeof usernameSchema>;

