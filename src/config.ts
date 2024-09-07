import {TelethonVariables} from "./types";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";

export const loadTelegramVariables = async (): Promise<TelethonVariables> => {
    const ssmClient = new SSMClient();

    const apiIdResponse = await ssmClient.send(new GetParameterCommand({Name: 'API_ID', WithDecryption: true}));
    const apiHashResponse = await ssmClient.send(new GetParameterCommand({Name: 'API_HASH', WithDecryption: true}));
    const stringSessionResponse = await ssmClient.send(new GetParameterCommand({
        Name: 'STRING_SESSION',
        WithDecryption: true
    }));

    const apiId = parseInt(apiIdResponse.Parameter?.Value || '');
    const apiHash = apiHashResponse.Parameter?.Value;
    const stringSession = stringSessionResponse.Parameter?.Value;

    if (!apiId || !apiHash || !stringSession) {
        throw new Error('Missing required environment variables');
    }

    return {
        TELETHON_API_ID: apiId,
        TELETHON_API_HASH: apiHash,
        TELETHON_SESSION_STRING: stringSession,
    };
}
