import {MyDynamoDBService} from "./my_dynamo_db_service";
import {UsernameCheckLog, usernameMonitorLogSchema} from "../types";
import {QueryCommandInput} from "@aws-sdk/client-dynamodb";

export class UsernameMonitorLogService extends MyDynamoDBService<UsernameCheckLog> {
    constructor(tableName: string) {
        super(tableName);
    }

    async createUsernameCheckLogs(usernameChecks: UsernameCheckLog[]): Promise<unknown> {
        return await this.batchWrite(usernameChecks);
    }

    async getLatestDayLogsByUsername(username: string): Promise<UsernameCheckLog[]> {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        const params: QueryCommandInput = {
            TableName: this.tableName,
			KeyConditionExpression: "#username = :username AND #date >= :oneDayAgo",
			ExpressionAttributeNames: {
				"#username": "username",
				"#date": "date"
			},
            ExpressionAttributeValues: {
                ":username": {S: username},
				":oneDayAgo": {N: oneDayAgo.toString()}
            },
			ScanIndexForward: false,
        };

        return this.queryItems(params, usernameMonitorLogSchema);
    }
}
