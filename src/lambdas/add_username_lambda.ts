import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {addUsernameRequestSchema} from "../types";
import {badRequest, internalError, success} from "../utils";
import {UsernameService} from "../services/username_service";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const usernameTableName = process.env.USERNAME_TABLE_NAME;
        if (!usernameTableName) {
            return internalError("USERNAME_TABLE_NAME is not set");
        }

        const parsedEvent = addUsernameRequestSchema.safeParse(JSON.parse(event.body || "{}"));
        if (!parsedEvent.success) {
            return badRequest(parsedEvent.error.errors);
        }
        const {username, watcher} = parsedEvent.data;

        const usernameService = new UsernameService(usernameTableName);
        await usernameService.createUsernameCheckLog({username, watcher});

        return success({
            message: "Username check log created successfully",
        });
    } catch (error) {
        return internalError(error);
    }
}
