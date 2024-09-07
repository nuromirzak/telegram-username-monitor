# Telegram Username Monitor CDK Stack

<details>
<summary>Table of Contents</summary>

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Deployment](#deployment)
4. [How it works](#how-it-works)
5. [TODO](#todo)
6. [Considerations](#considerations)

</details>

This project is an AWS CDK stack that deploys an application to monitor Telegram usernames and automatically occupy them
as soon as they become available. This project runs on AWS **Free Tier** services, incurring no costs under normal usage.

## Prerequisites

- Node.js
- npm
- AWS CLI configured with appropriate credentials
- Telegram API credentials (obtainable from https://my.telegram.org/auth)

## Setup

1. Clone this repository to your local machine.

2. Install dependencies:
   ```shell
   npm install
   ```

3. Copy the environment file and fill in your Telegram credentials:
   ```shell
   cp .env.example .env
   ```
   Edit `.env` and add your Telegram API ID and API Hash.

4. Copy the configuration file and specify the usernames to monitor:
   ```shell
   cp config.example.json config.json
   ```
   Edit `config.json` to add the desired usernames to monitor and set the check interval in minutes.

5. Build the project:
   ```shell
   npm run build
   ```

6. Generate a `STRING_SESSION` for Telegram authentication:
   ```shell
   npm run generate
   ```
   Follow the prompts to generate the session string. This will automatically be added to your `.env` file.

## Deployment

1. If you haven't bootstrapped your CDK environment, run:
   ```shell
   npx cdk bootstrap
   ```

2. Deploy the stack:
   ```shell
   npx cdk deploy
   ```

## How it works

Once deployed, the application will:

1. Monitor the specified Telegram usernames at the configured interval.
2. Send notifications about username availability.
3. Automatically create a channel with the desired username as soon as it becomes available.

## TODO

- [ ] Estimate WCU and RCU for the tables
- [ ] Estimate configuration for the lambda functions
- [ ] Add authentication to the API Gateway
- [ ] Create a single bash script to deploy the whole stack
- [ ] Replace an unencrypted `STRING_SESSION` with a secure method (e.g. AWS Secrets Manager)

## Considerations

1. The `account.checkUsername` API call can be called 200 times per day.
