import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Sonnet 4.6: the newest Sonnet enabled on the account. `-c jokeModel=<id>` overrides. */
export const DEFAULT_JOKE_MODEL = 'us.anthropic.claude-sonnet-4-6';

/** Files whose names do not change between builds: uploaded no-cache, after the hashed assets. */
export const NO_CACHE_FILES = ['index.html', 'manifest.webmanifest'];

export interface DadJokesStackProps extends StackProps {
  gitSha: string;
  webDist: string;
  jokeModel: string;
  /** Model calls per UTC day before jokes come from the library instead (a cost backstop). */
  aiDailyCap: number;
}

/**
 * The whole site (SPEC "Infrastructure"): one on-demand DynamoDB table, fn-api on a
 * Function URL, the page on S3, and one CloudFront distribution that serves the page and
 * routes /api/* to fn-api, so the browser talks to a single origin. Public: no login, no
 * secrets.
 */
export class DadJokesStack extends Stack {
  constructor(scope: Construct, id: string, props: DadJokesStackProps) {
    super(scope, id, props);

    // On-demand, not provisioned: Pantry and OurToDos already use the account's free 25 WCU.
    // The max request units cap what a burst (or a bot) can cost.
    const table = new dynamodb.Table(this, 'Table', {
      tableName: 'dadjokes',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      maxReadRequestUnits: 50,
      maxWriteRequestUnits: 20,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    // ---- fn-api ----
    const apiLogs = new logs.LogGroup(this, 'ApiLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const api = new NodejsFunction(this, 'Api', {
      entry: join(root, 'packages/api/src/handler.ts'),
      projectRoot: root,
      depsLockFilePath: join(root, 'pnpm-lock.yaml'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      // One Sonnet call writes a two-line joke: a few seconds at worst.
      timeout: Duration.seconds(20),
      logGroup: apiLogs,
      environment: {
        TABLE: table.tableName,
        STAGE: 'prod',
        GIT_SHA: props.gitSha,
        JOKE_MODEL: props.jokeModel,
        AI_DAILY_CAP: String(props.aiDailyCap),
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        forceDockerBundling: false,
        bundleAwsSDK: true,
        mainFields: ['module', 'main'],
      },
    });
    table.grantReadWriteData(api);
    api.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          this.formatArn({
            service: 'bedrock',
            resource: 'inference-profile',
            resourceName: 'us.anthropic.*',
          }),
          this.formatArn({
            service: 'bedrock',
            region: '*',
            account: '',
            resource: 'foundation-model',
            resourceName: 'anthropic.*',
          }),
        ],
      }),
    );
    const apiUrl = api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    // ---- The page ----
    const web = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const headers = new cloudfront.ResponseHeadersPolicy(this, 'WebHeaders', {
      comment: 'Dad-O-Matic security headers',
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: false,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "connect-src 'self'",
            "img-src 'self' data:",
            // The page injects its own <style>, which @imports Google Fonts.
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            'font-src https://fonts.gstatic.com',
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER,
          override: true,
        },
      },
    });
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: 'Dad-O-Matic 3000',
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(web),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: headers,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(Fn.select(2, Fn.split('/', apiUrl.url))),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: headers,
        },
      },
    });
    const webOrigin = `https://${distribution.distributionDomainName}`;

    const deployLogs = new logs.LogGroup(this, 'WebDeployLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const source = s3deploy.Source.asset(props.webDist);
    const assets = new s3deploy.BucketDeployment(this, 'WebAssets', {
      sources: [source],
      destinationBucket: web,
      exclude: NO_CACHE_FILES,
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=31536000, immutable')],
      prune: false,
      logGroup: deployLogs,
    });
    const shell = new s3deploy.BucketDeployment(this, 'WebShell', {
      sources: [source],
      destinationBucket: web,
      exclude: ['*'],
      include: NO_CACHE_FILES,
      cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
      prune: false,
      logGroup: deployLogs,
      // A new index.html must not be served from CloudFront's cache.
      distribution,
      distributionPaths: ['/index.html', '/manifest.webmanifest', '/'],
    });
    shell.node.addDependency(assets);

    new CfnOutput(this, 'WebUrl', { value: webOrigin });
    new CfnOutput(this, 'ApiUrl', { value: apiUrl.url });
  }
}
