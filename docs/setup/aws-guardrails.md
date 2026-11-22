# Step 3 – Deploy the cost guardrails

Allow about 15 minutes. Do this **before** anything else is deployed to AWS.

**What you'll create**

| What                                       | Why                                                                                                   | Cost |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---- |
| CDK bootstrap (small S3 bucket, IAM roles) | The roles that CDK uses to deploy. Needed once per account and region.                                | ≈ $0 |
| Monthly budget, $10                        | Emails you when actual spend passes **$1, $5 and $10**, and when the month is _forecast_ to pass $10. | $0   |
| Budget action                              | At **$10 actual**, AWS automatically attaches a policy that **blocks all deploys and new resources**. | $0   |
| GitHub OIDC provider and deploy role       | Lets GitHub Actions deploy later **without any stored AWS keys**, and only from this repository.      | $0   |

AWS charges nothing for IAM, OIDC or the first two budgets. The bootstrap bucket holds a few
kilobytes, which costs a fraction of a cent.

> **Honest limits of the budget action**
>
> - AWS updates billing data a few times a day, so alerts can arrive **hours after** the
>   spending happened. The budget is a safety net, not an instant cut-off.
> - It stops _new_ deploys and resources. It does **not** switch off what is already running.
>   The real protection against a runaway bill is that everything we build is pay-per-use and
>   rate-limited (API throttling, low Lambda concurrency, per-family LLM caps).
> - It controls the deploy roles, not your own admin login. Anything you create by hand in the
>   console is not blocked, so don't create resources by hand.

## Before you start

- Steps 2 B–F of [aws-account.md](aws-account.md) are done. You're signed in as your **admin
  user**, not root.
- The console region (top right) is **Asia Pacific (Mumbai) ap-south-1**.

## Part A – Bootstrap CDK (5 min)

1. Open **CloudShell** (the `>_` icon in the top bar).
2. Paste this and press Enter:

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text) && npx -y aws-cdk@latest bootstrap "aws://$ACCOUNT/ap-south-1" --tags project=task-organizer --tags env=shared
```

3. It takes 2–3 minutes. Wait for `✅ Environment aws://…/ap-south-1 bootstrapped.`

## Part B – Upload the guardrail template (2 min)

1. On GitHub, open
   [`infra/templates/account-baseline.json`](../../infra/templates/account-baseline.json). Use the
   branch of the pull request until it is merged.
2. Click the **Download raw file** button (a down-arrow icon, top right of the file view).
3. In CloudShell, click **Actions → Upload file** and choose the downloaded
   `account-baseline.json`. It lands in your home folder.
4. Check it arrived:

```bash
ls -l ~/account-baseline.json
```

## Part C – Deploy the guardrails (3 min)

Paste this. When asked, type the email address that should receive budget alerts, then press
Enter. The email is stored only in your AWS account, never in the code.

```bash
read -rp "Alert email: " ALERT_EMAIL && aws cloudformation deploy --region ap-south-1 --stack-name task-organizer-account-baseline --template-file ~/account-baseline.json --capabilities CAPABILITY_NAMED_IAM --parameter-overrides "AlertEmail=$ALERT_EMAIL" --tags project=task-organizer env=shared
```

Wait for `Successfully created/updated stack - task-organizer-account-baseline`.

## Part D – Check it worked (2 min)

Run this:

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text); aws budgets describe-budget --account-id "$ACCOUNT" --budget-name task-organizer-monthly --query 'Budget.[BudgetName,BudgetLimit.Amount,CalculatedSpend.ActualSpend.Amount]' --output text; aws budgets describe-budget-actions-for-budget --account-id "$ACCOUNT" --budget-name task-organizer-monthly --query 'Actions[0].[ActionType,ApprovalModel,Status]' --output text
```

You should see two lines like:

```text
task-organizer-monthly  10.0  0.0
APPLY_IAM_POLICY        AUTOMATIC       STANDBY
```

`STANDBY` means the stop action is armed and waiting. In the console, **Billing and Cost
Management → Budgets** now lists `task-organizer-monthly`.

## Part E – Activate the cost tags (1 min, can wait a day)

Cost Explorer can only filter by our tags once they are activated.

1. Go to **Billing and Cost Management → Cost allocation tags**.
2. Search for `project` and `env`. Tick both, then click **Activate**.

New tags take up to 24 hours to appear in the list. If they aren't there yet, come back
tomorrow.

---

## If the budget is exceeded

You'll get an email saying the action ran. Deploys now fail with an `AccessDenied` error, which
is intended.

1. Open **Cost Explorer**, group by **Service**, and find what's costing money.
2. Fix or delete it. `cdk destroy` still works under the stop policy.
3. Re-enable deploys. Open **IAM → Policies → `task-organizer-budget-stop` → Entities attached**
   and detach it from each role. Or, in **Budgets → task-organizer-monthly → Actions**, choose
   **Reverse action**.

## Changing limits later

The amounts live in `infra/lib/config.ts` (`BUDGET`). After a change, regenerate the template:

```bash
pnpm --filter @task-organizer/infra synth:baseline
```

Commit the result, then repeat Parts B and C. `deploy` updates the existing stack in place.

## Removing everything from this step

```bash
aws cloudformation delete-stack --region ap-south-1 --stack-name task-organizer-account-baseline
```

The CDK bootstrap stack is called `CDKToolkit`. Delete it only after every other project
stack is gone.
