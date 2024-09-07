import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {internalError, success} from "../utils";
import {UsernameMonitorLogService} from "../services/username_monitor_log_service";
import {typedConfig} from "../config";
import {UsernameCheckLog} from "../types";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const usernameMonitorLogTableName = process.env.USERNAME_MONITOR_LOG_TABLE_NAME;
        if (!usernameMonitorLogTableName) {
            return internalError("USERNAME_MONITOR_LOG_TABLE_NAME environment variable is missing");
        }

        const usernameCheckService = new UsernameMonitorLogService(usernameMonitorLogTableName);

        const response: UsernameCheckLog[] = [];

        for (let i = 0; i < typedConfig.usernames.length; i++) {
            const username = typedConfig.usernames[i];
            const usernameCheckLogs = await usernameCheckService.getLatestDayLogsByUsername(username);
            response.push(...usernameCheckLogs);
        }

        return success(response);
    } catch (error) {
        return internalError(error);
    }
}
