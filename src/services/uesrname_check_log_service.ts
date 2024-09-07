import {MyDynamoDBService} from "./my_dynamo_db_service";
import {UsernameCheckLog, usernameCheckLogSchema} from "../types";
import {QueryCommandInput} from "@aws-sdk/client-dynamodb";

export class UsernameCheckLogService extends MyDynamoDBService<UsernameCheckLog> {
    constructor(tableName: string) {
        super(tableName);
    }

    async createUsernameCheckLogs(usernameChecks: UsernameCheckLog[]): Promise<unknown> {
        return await this.batchWrite(usernameChecks);
    }

    async getLogsByUsername(username: string): Promise<UsernameCheckLog[]> {
        const params: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression: "#username = :username",
            ExpressionAttributeNames: {
                "#username": "username"
            },
            ExpressionAttributeValues: {
                ":username": {S: username}
            }
        };

        return this.queryItems(params, usernameCheckLogSchema);
    }
}
