import {configSchema, TelethonVariables} from "./types";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import configJson from "./config.json";

export const loadTelegramVariables = async (): Promise<TelethonVariables> => {
    const ssmClient = new SSMClient();

    const apiIdResponse = await ssmClient.send(new GetParameterCommand({Name: 'API_ID'}));
    const apiHashResponse = await ssmClient.send(new GetParameterCommand({Name: 'API_HASH'}));
    const stringSessionResponse = await ssmClient.send(new GetParameterCommand({
        Name: 'STRING_SESSION',
    }));

    const apiId = parseInt(apiIdResponse.Parameter?.Value || '');
    const apiHash = apiHashResponse.Parameter?.Value;
    const stringSession = stringSessionResponse.Parameter?.Value;

    if (!apiId || !apiHash || !stringSession) {
        throw new Error('Missing one of the required parameters: API_ID, API_HASH, STRING_SESSION');
    }

    return {
        API_ID: apiId,
        API_HASH: apiHash,
        SESSION_STRING: stringSession,
    };
}

export const typedConfig = configSchema.parse(configJson);
console.log('Loaded config:', typedConfig);
