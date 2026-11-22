import { CfnParameter, Stack, type StackProps, Fn } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import { BUDGET, CDK_QUALIFIER, GITHUB_REPO, PROJECT, REGION } from './config.js';

/**
 * One-per-account safety net, deployed once by hand from CloudShell:
 *
 * 1. A monthly cost budget with email alerts ($1 / $5 / $10 actual, $10 forecast).
 * 2. A budget action: when actual spend reaches the limit, AWS automatically attaches
 *    a deny policy to the deploy roles, so no new deploys or resources can be created
 *    until you remove it. Deleting (`cdk destroy`) still works.
 * 3. GitHub OIDC: lets GitHub Actions deploy without any stored AWS keys, only from
 *    this repo and only from the `dev` / `prod` GitHub environments.
 *
 * Uses no CDK assets, so the synthesized template is plain CloudFormation.
 */
export class AccountBaselineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const alertEmail = new CfnParameter(this, 'AlertEmail', {
      type: 'String',
      description: 'Email address that receives budget alerts.',
      allowedPattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      constraintDescription: 'Must be a valid email address.',
    });

    const account = this.account;
    const cdkRole = (kind: string) => `cdk-${CDK_QUALIFIER}-${kind}-role-${account}-${REGION}`;

    // ---- GitHub OIDC ------------------------------------------------------
    const oidc = new iam.CfnOIDCProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIdList: ['sts.amazonaws.com'],
    });

    const githubDeployRole = new iam.Role(this, 'GitHubDeployRole', {
      roleName: `${PROJECT}-github-deploy`,
      description: `Assumed by GitHub Actions in ${GITHUB_REPO} (dev/prod environments only).`,
      assumedBy: new iam.FederatedPrincipal(
        oidc.attrArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': [
              `repo:${GITHUB_REPO}:environment:dev`,
              `repo:${GITHUB_REPO}:environment:prod`,
            ],
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });
    // Least privilege: GitHub may only hop into the CDK bootstrap roles.
    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${account}:role/cdk-${CDK_QUALIFIER}-*-role-${account}-${REGION}`,
        ],
      }),
    );

    // ---- Stop policy (attached automatically when the budget is exceeded) --
    const stopPolicy = new iam.ManagedPolicy(this, 'BudgetStopPolicy', {
      managedPolicyName: `${PROJECT}-budget-stop`,
      description:
        'Attached by AWS Budgets when the monthly limit is hit. Blocks deploys and new ' +
        'resources; deletes are still allowed. Detach manually once costs are understood.',
      statements: [
        new iam.PolicyStatement({
          sid: 'BlockDeploys',
          effect: iam.Effect.DENY,
          actions: [
            'cloudformation:CreateStack',
            'cloudformation:UpdateStack',
            'cloudformation:CreateChangeSet',
            'cloudformation:ExecuteChangeSet',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'BlockNewResources',
          effect: iam.Effect.DENY,
          actions: [
            'lambda:CreateFunction',
            'lambda:UpdateFunctionCode',
            'lambda:PutFunctionConcurrency',
            'lambda:PutProvisionedConcurrencyConfig',
            'dynamodb:CreateTable',
            's3:CreateBucket',
            'cloudfront:CreateDistribution',
            'apigateway:POST',
            'apigateway:PUT',
            'apigateway:PATCH',
            'cognito-idp:CreateUserPool',
            'ec2:RunInstances',
            'ec2:CreateNatGateway',
            'ec2:CreateVpc',
            'rds:Create*',
            'elasticloadbalancing:Create*',
            'ecs:Create*',
            'eks:Create*',
            'elasticache:Create*',
            'sagemaker:Create*',
          ],
          resources: ['*'],
        }),
      ],
    });

    const stopTargets = [githubDeployRole.roleName, cdkRole('deploy'), cdkRole('cfn-exec')];

    // ---- Budget ------------------------------------------------------------
    const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `${PROJECT}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: BUDGET.monthlyLimitUsd, unit: 'USD' },
        // Show real usage: credits and refunds would otherwise hide spend.
        costTypes: { includeCredit: false, includeRefund: false },
      },
      notificationsWithSubscribers: [
        ...BUDGET.alertThresholdsUsd.map((usd) => ({
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: usd,
            thresholdType: 'ABSOLUTE_VALUE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail.valueAsString }],
        })),
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: BUDGET.monthlyLimitUsd,
            thresholdType: 'ABSOLUTE_VALUE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail.valueAsString }],
        },
      ],
    });

    // ---- Budget action ------------------------------------------------------
    const budgetsActionRole = new iam.Role(this, 'BudgetsActionRole', {
      roleName: `${PROJECT}-budgets-action`,
      assumedBy: new iam.ServicePrincipal('budgets.amazonaws.com', {
        conditions: { StringEquals: { 'aws:SourceAccount': account } },
      }),
    });
    const budgetsActionPolicy = new iam.Policy(this, 'BudgetsActionPolicy', {
      roles: [budgetsActionRole],
      statements: [
        new iam.PolicyStatement({
          actions: ['iam:AttachRolePolicy', 'iam:DetachRolePolicy'],
          resources: stopTargets.map((name) => `arn:aws:iam::${account}:role/${name}`),
          conditions: { ArnEquals: { 'iam:PolicyARN': stopPolicy.managedPolicyArn } },
        }),
      ],
    });

    const action = new budgets.CfnBudgetsAction(this, 'StopOnBudgetExceeded', {
      budgetName: Fn.ref(budget.logicalId),
      notificationType: 'ACTUAL',
      actionType: 'APPLY_IAM_POLICY',
      actionThreshold: { type: 'ABSOLUTE_VALUE', value: BUDGET.monthlyLimitUsd },
      executionRoleArn: budgetsActionRole.roleArn,
      approvalModel: 'AUTOMATIC',
      definition: {
        iamActionDefinition: { policyArn: stopPolicy.managedPolicyArn, roles: stopTargets },
      },
      subscribers: [{ type: 'EMAIL', address: alertEmail.valueAsString }],
    });
    // The action role's permissions must exist before Budgets validates the action.
    action.node.addDependency(budgetsActionPolicy);
  }
}
