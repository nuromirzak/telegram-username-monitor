import {
    BatchWriteItemCommand,
    BatchWriteItemCommandInput,
    DynamoDBClient,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    WriteRequest
} from "@aws-sdk/client-dynamodb";
import {marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {ZodSchema} from "zod";
import {chunkArray, logFailedWriteRequests} from "../utils";

export abstract class MyDynamoDBService<T> {
    protected readonly dynamodbClient: DynamoDBClient;
    protected readonly tableName: string;

    protected constructor(tableName: string) {
        this.dynamodbClient = new DynamoDBClient();
        this.tableName = tableName;
    }

    protected async batchWrite(items: T[]): Promise<WriteRequest[]> {
        const chunks = chunkArray<T>(items, 25);
        const writeRequests: WriteRequest[][] = chunks.map(chunk => {
            return chunk.map(item => {
                return {
                    PutRequest: {
                        Item: marshall(item),
                    },
                };
            });
        });

        const promises = await Promise.all(writeRequests.map(writeRequest => {
            return this.processBatchWriteRequests(writeRequest);
        }));

        return promises.flat();
    }

    protected async batchDeleteItems(
        partitionKey: string,
        values: { partitionValue: string, sortValue?: number }[],
        sortKey?: string,
    ): Promise<WriteRequest[]> {
        const chunks = chunkArray(values, 25);
        const writeRequests: WriteRequest[][] = chunks.map(chunk => {
            return chunk.map(item => {
                const key: { [key: string]: AttributeValue } = {
                    [partitionKey]: {S: item.partitionValue}
                };
                if (sortKey && item.sortValue) {
                    key[sortKey] = {N: item.sortValue.toString()};
                }
                return {
                    DeleteRequest: {
                        Key: key,
                    },
                };
            });
        });

        const promises = await Promise.all(writeRequests.map(writeRequest => {
            return this.processBatchWriteRequests(writeRequest);
        }));

        return promises.flat();
    }

    private async processBatchWriteRequests(writeRequests: WriteRequest[]): Promise<WriteRequest[]> {
        const params: BatchWriteItemCommandInput = {
            RequestItems: {
                [this.tableName]: writeRequests,
            },
        };
        const command = new BatchWriteItemCommand(params);

        try {
            const result = await this.dynamodbClient.send(command);
            if (result.UnprocessedItems && result.UnprocessedItems[this.tableName]) {
                logFailedWriteRequests(result);
                return result.UnprocessedItems[this.tableName];
            }
        } catch (error) {
            console.error('Batch write failed:', error);
        }

        return [];
    }

    protected async queryItems(params: QueryCommandInput, schema: ZodSchema<T>): Promise<T[]> {
        const response = await this.dynamodbClient.send(new QueryCommand(params));
        const items = response.Items || [];
        return this.parseItems(items, schema);
    }

    protected async scanItems(params: ScanCommandInput, schema: ZodSchema<T>): Promise<T[]> {
        const response = await this.dynamodbClient.send(new ScanCommand(params));
        const items = response.Items || [];
        return this.parseItems(items, schema);
    }

    private parseItems(items: Record<string, AttributeValue>[], schema: ZodSchema<T>): T[] {
        return items.map(item => {
            const result = schema.safeParse(unmarshall(item));
            if (!result.success) {
                console.error('Validation error:', result.error.errors);
                return null;
            }
            return result.data;
        }).filter(item => item !== null);
    }
}
