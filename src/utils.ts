import {APIGatewayProxyResult} from "aws-lambda";
import {BatchWriteItemCommandOutput} from "@aws-sdk/client-dynamodb";

export function badRequest(error: unknown): APIGatewayProxyResult {
    return {
        statusCode: 400,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            error,
        }),
    };
}

export function internalError(error: unknown): APIGatewayProxyResult {
    console.error('Internal error:', error);
    return {
        statusCode: 500,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            error,
        }),
    };
}

export function success<T>(data: T): APIGatewayProxyResult {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(data),
    };
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

export function logFailedWriteRequests(result: BatchWriteItemCommandOutput): void {
    console.error('Unprocessed items:', JSON.stringify(result.UnprocessedItems, null, 2));
    if (result.$metadata && result.$metadata.httpStatusCode !== 200) {
        console.error('HTTP Status Code:', result.$metadata.httpStatusCode);
    }
    if (result.ConsumedCapacity) {
        console.error('Consumed Capacity:', JSON.stringify(result.ConsumedCapacity, null, 2));
    }
    if (result.ItemCollectionMetrics) {
        console.error('Item Collection Metrics:', JSON.stringify(result.ItemCollectionMetrics, null, 2));
    }
}
