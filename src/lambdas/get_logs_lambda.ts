import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {badRequest, internalError, success} from "../utils";
import {UsernameCheckLogService} from "../services/uesrname_check_log_service";
import {UsernameService} from "../services/username_service";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const usernameCheckLogTableName = process.env.USERNAME_CHECK_LOG_TABLE_NAME;
        const usernameTableName = process.env.USERNAME_TABLE_NAME;
        if (!usernameCheckLogTableName || !usernameTableName) {
            return internalError("USERNAME_CHECK_LOG_TABLE_NAME or USERNAME_TABLE_NAME environment variable is missing");
        }

        const watcher = event.queryStringParameters?.watcher;
        if (!watcher) {
            return badRequest({ message: "Watcher parameter is missing" });
        }

        const usernameCheckService = new UsernameCheckLogService(usernameCheckLogTableName);
        const usernameService = new UsernameService(usernameTableName);

        const trackedUsernames = await usernameService.getUsernamesByWatcher(watcher);

        if (trackedUsernames.length === 0) {
            return badRequest({
                message: `No usernames found for watcher ${watcher}`,
            });
        }

        const username = trackedUsernames[0].username;

        const usernameCheckLogs = await usernameCheckService.getLogsByUsername(username);

        return success(usernameCheckLogs);
    } catch (error) {
        return internalError(error);
    }
}
