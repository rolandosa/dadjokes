import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { DadJokesStack } from '../lib/dadjokes-stack.js';

let template: Template;

beforeAll(() => {
  const dist = mkdtempSync(join(tmpdir(), 'dadjokes-dist-'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html>');
  const app = new App();
  const stack = new DadJokesStack(app, 'DadJokes', {
    env: { account: '123456789012', region: 'us-east-2' },
    gitSha: 'test',
    webDist: dist,
    jokeModel: 'us.anthropic.claude-sonnet-4-6',
    aiDailyCap: 500,
  });
  template = Template.fromStack(stack);
}, 120_000);

describe('DadJokesStack', () => {
  it('has one on-demand table with capped throughput, retained', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      Properties: Match.objectLike({
        TableName: 'dadjokes',
        BillingMode: 'PAY_PER_REQUEST',
        OnDemandThroughput: { MaxReadRequestUnits: 50, MaxWriteRequestUnits: 20 },
        GlobalSecondaryIndexes: Match.absent(),
      }),
    });
  });

  it('runs fn-api on Node 22 arm64 with the joke model and cap', () => {
    const fns = template.findResources('AWS::Lambda::Function', {
      Properties: { Runtime: 'nodejs22.x' },
    });
    expect(Object.keys(fns)).toHaveLength(1);
    const f = Object.values(fns)[0]!;
    expect(f.Properties.Architectures).toEqual(['arm64']);
    expect(f.Properties.Environment.Variables).toMatchObject({
      JOKE_MODEL: 'us.anthropic.claude-sonnet-4-6',
      AI_DAILY_CAP: '500',
      STAGE: 'prod',
    });
    template.resourceCountIs('AWS::Lambda::Url', 1);
  });

  it('lets fn-api call only Anthropic models in Bedrock', () => {
    const statements = Object.values(template.findResources('AWS::IAM::Policy')).flatMap(
      (p) => p.Properties.PolicyDocument.Statement as Array<{ Action: unknown; Resource: unknown }>,
    );
    const bedrock = statements.filter((s) => s.Action === 'bedrock:InvokeModel');
    expect(bedrock).toHaveLength(1);
    expect(JSON.stringify(bedrock[0]!.Resource)).toContain('anthropic.*');
  });

  it('serves the page and /api/* from one CloudFront distribution', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        CacheBehaviors: [Match.objectLike({ PathPattern: '/api/*' })],
      }),
    });
  });
});
