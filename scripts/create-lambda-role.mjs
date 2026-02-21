import { IAMClient, CreateRoleCommand, PutRolePolicyCommand, GetRoleCommand } from '@aws-sdk/client-iam';

const client = new IAMClient({ region: 'us-east-1' });

const ROLE_NAME = 'remotion-lambda-role';

const trustPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    },
  ],
};

const rolePolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'LambdaInvoke',
      Effect: 'Allow',
      Action: ['lambda:InvokeFunction'],
      Resource: ['arn:aws:lambda:*:*:function:remotion-render-*'],
    },
    {
      Sid: 'S3Access',
      Effect: 'Allow',
      Action: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:PutObjectAcl',
      ],
      Resource: ['arn:aws:s3:::remotionlambda-*', 'arn:aws:s3:::remotionlambda-*/*'],
    },
    {
      Sid: 'CloudWatchLogs',
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      Resource: ['arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*:*'],
    },
  ],
};

async function main() {
  // Check if role exists
  try {
    await client.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
    console.log(`Role ${ROLE_NAME} already exists`);
  } catch (err) {
    if (err.name === 'NoSuchEntityException') {
      // Create the role
      console.log(`Creating role ${ROLE_NAME}...`);
      await client.send(new CreateRoleCommand({
        RoleName: ROLE_NAME,
        AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
        Description: 'Role for Remotion Lambda rendering',
      }));
      console.log('Role created!');
    } else {
      throw err;
    }
  }

  // Attach inline policy
  console.log('Attaching policy...');
  await client.send(new PutRolePolicyCommand({
    RoleName: ROLE_NAME,
    PolicyName: 'remotion-lambda-policy',
    PolicyDocument: JSON.stringify(rolePolicy),
  }));
  console.log('Policy attached!');

  // Wait for role to propagate
  console.log('Waiting 10s for role to propagate...');
  await new Promise(r => setTimeout(r, 10000));
  console.log('Done! You can now deploy the Lambda function.');
}

main().catch(console.error);
