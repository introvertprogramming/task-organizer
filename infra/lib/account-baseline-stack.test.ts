import { App, BootstraplessSynthesizer } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { AccountBaselineStack } from './account-baseline-stack.js';

let template: Template;

beforeAll(() => {
  const app = new App();
  const stack = new AccountBaselineStack(app, 'Test', {
    env: { region: 'ap-south-1' },
    synthesizer: new BootstraplessSynthesizer(),
  });
  template = Template.fromStack(stack);
});

describe('AccountBaselineStack', () => {
  it('creates a $10 monthly budget that ignores credits', () => {
    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({
        BudgetLimit: { Amount: 10, Unit: 'USD' },
        TimeUnit: 'MONTHLY',
        CostTypes: { IncludeCredit: false, IncludeRefund: false },
      }),
    });
  });

  it('alerts at $1, $5 and $10 actual plus $10 forecast', () => {
    const budget = Object.values(template.findResources('AWS::Budgets::Budget'))[0];
    const notes = (
      budget?.Properties.NotificationsWithSubscribers as {
        Notification: { NotificationType: string; Threshold: number };
      }[]
    ).map((n) => `${n.Notification.NotificationType}:${n.Notification.Threshold}`);
    expect(notes).toEqual(['ACTUAL:1', 'ACTUAL:5', 'ACTUAL:10', 'FORECASTED:10']);
  });

  it('automatically attaches the stop policy at the limit', () => {
    template.hasResourceProperties('AWS::Budgets::BudgetsAction', {
      ActionType: 'APPLY_IAM_POLICY',
      ApprovalModel: 'AUTOMATIC',
      ActionThreshold: { Type: 'ABSOLUTE_VALUE', Value: 10 },
    });
  });

  it('stop policy blocks deploys but never blocks deletes', () => {
    const policy = Object.values(template.findResources('AWS::IAM::ManagedPolicy'))[0];
    const statements = policy?.Properties.PolicyDocument.Statement as {
      Effect: string;
      Action: string[];
    }[];
    const denied = statements.flatMap((s) => s.Action);
    expect(statements.every((s) => s.Effect === 'Deny')).toBe(true);
    expect(denied).toContain('cloudformation:CreateChangeSet');
    expect(denied.some((a) => /delete/i.test(a))).toBe(false);
  });

  it('GitHub can deploy only from this repo via the dev/prod environments', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'task-organizer-github-deploy',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub': [
                  'repo:introvertprogramming/task-organizer:environment:dev',
                  'repo:introvertprogramming/task-organizer:environment:prod',
                ],
              },
            },
          }),
        ],
      }),
    });
  });

  it('creates no IAM users or access keys', () => {
    template.resourceCountIs('AWS::IAM::User', 0);
    template.resourceCountIs('AWS::IAM::AccessKey', 0);
  });

  it('needs no CDK bootstrap assets (plain template for CloudShell)', () => {
    expect(JSON.stringify(template.toJSON())).not.toContain('BootstrapVersion');
  });
});
