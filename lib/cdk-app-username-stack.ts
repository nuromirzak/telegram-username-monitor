import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from "node:path";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dotenv from 'dotenv';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {BundlingOptions} from "aws-cdk-lib/aws-lambda-nodejs/lib/types";
import {typedConfig} from "../src/config";

dotenv.config({
	path: path.resolve(__dirname, '../.env'),
});

const usernameMonitorLogTableName = 'UsernameMonitorLogTable';

const usernameMonitorLambdaName = 'UsernameMonitorLambda';
const getLogsLambdaName = 'GetLogsLambda';

const bundlingOptions: BundlingOptions = {
	minify: true,
	sourceMap: true,
	target: 'es2022',
};

export class CdkAppUsernameStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const API_ID = process.env.API_ID;
		const API_HASH = process.env.API_HASH;
		const STRING_SESSION = process.env.STRING_SESSION;

		console.log('API_ID:', API_ID);
		console.log('API_HASH:', API_HASH);
		console.log('STRING_SESSION:', STRING_SESSION);

		if (!API_ID || !API_HASH || !STRING_SESSION) {
			throw new Error('Missing one of the required parameters: API_ID, API_HASH, STRING_SESSION');
		}

		const apiIdParameter = new ssm.StringParameter(this, 'API_ID', {
			parameterName: 'API_ID',
			stringValue: API_ID,
		});

		const apiHashParameter = new ssm.StringParameter(this, 'API_HASH', {
			parameterName: 'API_HASH',
			stringValue: API_HASH,
		});

		const stringSessionParameter = new ssm.StringParameter(this, 'STRING_SESSION', {
			parameterName: 'STRING_SESSION',
			stringValue: STRING_SESSION,
		});

		const usernameMonitorLogTable = new dynamodb.Table(this, usernameMonitorLogTableName, {
			partitionKey: {name: 'username', type: dynamodb.AttributeType.STRING},
			sortKey: {name: 'date', type: dynamodb.AttributeType.NUMBER},
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			readCapacity: 3,
			writeCapacity: 3,
		});

		const usernameMonitorLambda = new lambdaNodejs.NodejsFunction(this, usernameMonitorLambdaName, {
			entry: path.resolve(__dirname, '../src/lambdas/username_monitor_lambda.ts'),
			memorySize: 512,
			timeout: cdk.Duration.seconds(300),
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: {
				USERNAME_MONITOR_LOG_TABLE_NAME: usernameMonitorLogTable.tableName
			},
			bundling: bundlingOptions,
		});

		usernameMonitorLogTable.grantWriteData(usernameMonitorLambda);

		const rule = new events.Rule(this, 'UsernameCheckerRule', {
			schedule: events.Schedule.rate(cdk.Duration.minutes(typedConfig.checkIntervalMinutes)),
		});

		rule.addTarget(new targets.LambdaFunction(usernameMonitorLambda));

		const getLogsLambda = new lambdaNodejs.NodejsFunction(this, getLogsLambdaName, {
			entry: path.resolve(__dirname, '../src/lambdas/get_logs_lambda.ts'),
			memorySize: 256,
			timeout: cdk.Duration.seconds(15),
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: {
				USERNAME_MONITOR_LOG_TABLE_NAME: usernameMonitorLogTable.tableName,
			},
			bundling: bundlingOptions,
		});

		usernameMonitorLogTable.grantReadData(getLogsLambda);

		apiIdParameter.grantRead(usernameMonitorLambda);
		apiHashParameter.grantRead(usernameMonitorLambda);
		stringSessionParameter.grantRead(usernameMonitorLambda);

		const api = new apigateway.RestApi(this, 'UsernameCheckerApi', {
			restApiName: 'Username Monitor API',
		});

		const logs = api.root.addResource('logs');
		logs.addMethod('GET', new apigateway.LambdaIntegration(getLogsLambda));

		new cdk.CfnOutput(this, 'ApiUrl', {
			value: api.url,
		});
	}
}
