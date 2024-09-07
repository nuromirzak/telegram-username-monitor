import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from "node:path";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class CdkAppUsernameStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const usernameCheckLogTable = new dynamodb.Table(this, 'UsernameCheckLogTable', {
            partitionKey: {name: 'username', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'date', type: dynamodb.AttributeType.NUMBER},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            readCapacity: 5,
            writeCapacity: 5,
        });

        const usernameTable = new dynamodb.Table(this, 'UsernameTable', {
            partitionKey: {name: 'watcher', type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            readCapacity: 3,
            writeCapacity: 3,
        });

        const usernameCheckerLambda = new lambdaNodejs.NodejsFunction(this, 'UsernameCheckerLambda', {
            entry: path.resolve(__dirname, '../src/lambdas/username_checker_lambda.ts'),
            memorySize: 512,
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                USERNAME_CHECK_LOG_TABLE_NAME: usernameCheckLogTable.tableName,
                USERNAME_TABLE_NAME: usernameTable.tableName,
            },
            bundling: {
                minify: true,
                sourceMap: true,
                target: 'es2020',
            },
        });

        usernameTable.grantReadData(usernameCheckerLambda);
        usernameCheckLogTable.grantWriteData(usernameCheckerLambda);

        const rule = new events.Rule(this, 'UsernameCheckerRule', {
            schedule: events.Schedule.expression('rate(10 minutes)'),
        });

        rule.addTarget(new targets.LambdaFunction(usernameCheckerLambda));

        const addUsernameLambda = new lambdaNodejs.NodejsFunction(this, 'AddUsernameLambda', {
            entry: path.resolve(__dirname, '../src/lambdas/add_username_lambda.ts'),
            memorySize: 256,
            timeout: cdk.Duration.seconds(15),
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                USERNAME_TABLE_NAME: usernameTable.tableName,
            },
            bundling: {
                minify: true,
                sourceMap: true,
                target: 'es2020',
            },
        });

        usernameTable.grantWriteData(addUsernameLambda);

        const getLogsLambda = new lambdaNodejs.NodejsFunction(this, 'GetLogsLambda', {
            entry: path.resolve(__dirname, '../src/lambdas/get_logs_lambda.ts'),
            memorySize: 256,
            timeout: cdk.Duration.seconds(15),
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                USERNAME_CHECK_LOG_TABLE_NAME: usernameCheckLogTable.tableName,
                USERNAME_TABLE_NAME: usernameTable.tableName,
            },
            bundling: {
                minify: true,
                sourceMap: true,
                target: 'es2020',
            },
        });

        usernameTable.grantReadData(getLogsLambda);
        usernameCheckLogTable.grantReadData(getLogsLambda);

        const ssmPolicy = new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter/API_ID`,
                `arn:aws:ssm:${this.region}:${this.account}:parameter/API_HASH`,
                `arn:aws:ssm:${this.region}:${this.account}:parameter/STRING_SESSION`
            ],
        });

        usernameCheckerLambda.addToRolePolicy(ssmPolicy);

        const api = new apigateway.RestApi(this, 'UsernameCheckerApi', {
            restApiName: 'Username Checker API',
        });

        const optionsIntegration = new apigateway.MockIntegration({
            integrationResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST,GET'"
                    },
                },
            ],
            passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        });

        const addUsernameModel = api.addModel('AddUsernameModel', {
            contentType: 'application/json',
            modelName: 'AddUsernameRequest',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    username: {type: apigateway.JsonSchemaType.STRING},
                    watcher: {type: apigateway.JsonSchemaType.STRING}
                },
                required: ['username', 'watcher']
            }
        });

        const usernames = api.root.addResource('usernames');
        usernames.addMethod('POST', new apigateway.LambdaIntegration(addUsernameLambda), {
            requestModels: {
                'application/json': addUsernameModel
            }
        });
        usernames.addMethod('OPTIONS', optionsIntegration, {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    }
                }
            ]
        });
        const logs = api.root.addResource('logs');
        logs.addMethod('GET', new apigateway.LambdaIntegration(getLogsLambda), {
            requestParameters: {
                'method.request.querystring.watcher': true,
            }
        });
        logs.addMethod('OPTIONS', optionsIntegration, {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    }
                }
            ]
        });
    }
}
