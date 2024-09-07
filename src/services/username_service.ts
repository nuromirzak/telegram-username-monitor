import {MyDynamoDBService} from "./my_dynamo_db_service";
import {Username, usernameSchema} from "../types";
import {QueryCommandInput} from "@aws-sdk/client-dynamodb";

export class UsernameService extends MyDynamoDBService<Username> {
    constructor(tableName: string) {
        super(tableName);
    }

    async createUsernameCheckLog(username: Username): Promise<unknown> {
        return await this.batchWrite([username]);
    }

    async getUsernames(): Promise<Username[]> {
        const params: QueryCommandInput = {
            TableName: this.tableName,
        };

        return this.scanItems(params, usernameSchema);
    }

    async getUsernamesByWatcher(watcher: string): Promise<Username[]> {
        const params: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression: "#watcher = :watcher",
            ExpressionAttributeNames: {
                "#watcher": "watcher"
            },
            ExpressionAttributeValues: {
                ":watcher": {S: watcher}
            }
        };
        return this.queryItems(params, usernameSchema);
    }
}
