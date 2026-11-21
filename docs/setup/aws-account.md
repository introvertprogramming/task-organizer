# Step 2 – Secure your AWS account

Allow about 30 minutes. Everything here happens in the AWS web console and costs **$0**.

AWS renames console buttons from time to time. If a label below doesn't match what you see,
look for the closest match, or ask.

> **Golden rules**
>
> - After Part B, never use the **root** user (the email you signed up with) for day-to-day work.
> - Never create **access keys** (long-lived passwords for programs). We deploy from
>   CloudShell and from GitHub Actions using OIDC, so no keys are needed anywhere.
> - Never paste passwords, MFA codes or keys into chat, code or GitHub.

---

## Part A – Check which plan your account is on (2 min)

Accounts created after 15 July 2025 are on either the **Free plan** or the **Paid plan**.

1. Sign in at <https://console.aws.amazon.com> as the **root user**.
2. In the search bar at the top, type **Billing and Cost Management** and open it.
3. In the left menu, open **Free Tier** (or **Credits**). It shows:
   - your plan: **Free** or **Paid**
   - how many credits are left
   - the date the free period ends
4. Write these three things down.

| If you are on the… | What it means for you                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free plan**      | AWS cannot charge your card. When the credits or 6 months run out, the account is suspended until you upgrade. You will need to upgrade before launching to real users. |
| **Paid plan**      | Usage beyond the credits is charged to your card. The budget alerts in step 3 are your safety net.                                                                      |

Stay on the Free plan while we build. We'll decide when to upgrade closer to launch.

## Part B – Turn on MFA for the root user (5 min)

1. Click your **account name** (top right) and choose **Security credentials**.
2. Under **Multi-factor authentication (MFA)**, click **Assign MFA device**.
3. Name it, for example `root-phone`, and choose one of:
   - **Passkey or security key** (simplest: uses your phone's fingerprint or face unlock), or
   - **Authenticator app** (Google Authenticator, Microsoft Authenticator or similar).
4. Follow the prompts until you see **MFA device assigned**.
5. Sign out, then sign in again to check that MFA works.

## Part C – Let IAM users see billing (2 min, root only)

Without this, your admin user (Part D) can't see costs, even with full admin rights.

1. As root, click your **account name** (top right) and choose **Account**.
2. Scroll to **IAM user and role access to Billing information** and click **Edit**.
3. Tick **Activate IAM Access** and click **Update**.

While you're on this page, it's worth filling in **Alternate contacts → Billing** with your own
email, so billing notices also reach you there.

## Part D – Create your admin user (10 min)

1. In the search bar, type **IAM** and open it.
2. On the IAM dashboard, find **AWS Account → Account alias** and click **Create**. Choose a
   short name such as `task-organizer-yourname`. This gives you a memorable sign-in link.
3. In the left menu, open **Users** and click **Create user**.
   - **User name:** e.g. `yourname-admin`
   - Tick **Provide user access to the AWS Management Console**.
   - If asked, choose **I want to create an IAM user**.
   - Choose **Custom password**, enter a strong password, and untick **Users must create a new
     password at next sign-in**.
   - Click **Next**.
4. Choose **Attach policies directly**, search for `AdministratorAccess`, tick it, and click
   **Next**, then **Create user**.
5. **Copy the console sign-in URL** shown on the final page, for example
   `https://task-organizer-yourname.signin.aws.amazon.com/console`, and bookmark it.
6. Sign out of root. Open the sign-in URL and sign in as `yourname-admin`.
7. Add MFA to the admin user:
   - Open **IAM → Users → yourname-admin → Security credentials**.
   - Click **Assign MFA device** and repeat the steps from Part B.
8. Sign out and sign in again as `yourname-admin` to check that MFA works.

From now on, always sign in with this bookmarked link as `yourname-admin`.

> AWS also offers _IAM Identity Center_ for sign-in. It's better for teams, but an IAM user
> with MFA is simpler and safe for a single developer.

## Part E – Turn on cost alerts and Cost Explorer (5 min)

Signed in as `yourname-admin`:

1. Open **Billing and Cost Management → Billing preferences** (left menu, sometimes under
   **Preferences and settings**).
2. Under **Alert preferences**, click **Edit**:
   - Tick **Receive AWS Free Tier alerts** and enter your email.
   - Tick **Receive CloudWatch billing alerts**.
   - Click **Update**.
3. Open **Cost Explorer** in the left menu. The first visit turns it on, and data can take up
   to 24 hours to appear. That's normal.

The $1, $5 and $10 budget alerts and the automatic "stop" action are created as code in step 3.
That way they are versioned and reviewed like everything else.

## Part F – Pick the Mumbai region and open CloudShell (3 min)

1. In the top bar, click the **region** name (for example "N. Virginia") and choose **Asia
   Pacific (Mumbai) ap-south-1**. All our resources go here.
2. Click the **CloudShell** icon (a `>_` symbol in the top bar), or search for "CloudShell".
   CloudShell is a free Linux terminal in your browser, already signed in as you.
3. When the prompt appears, run:

```bash
aws sts get-caller-identity --query Arn --output text
```

4. You should see something like:

```text
arn:aws:iam::123456789012:user/yourname-admin
```

If it ends in `:root` instead, you're signed in as root. Sign out and use the admin link from
Part D.

---

## How to check your bill at any time

- **Quickest:** **Billing and Cost Management → Home** shows month-to-date cost and the
  forecast for the month.
- **Per service or project:** **Cost Explorer**. Group by **Service**. After step 3, you can
  also filter by **Tag → `project` = `task-organizer`**.
- **Credits left (Free plan):** **Billing and Cost Management → Free Tier** or **Credits**.
- **From CloudShell:** month-to-date cost, credits excluded so you see real usage:

```bash
aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-01),End=$(date -d tomorrow +%F) --granularity MONTHLY --metrics UnblendedCost --filter '{"Not":{"Dimensions":{"Key":"RECORD_TYPE","Values":["Credit"]}}}' --query 'ResultsByTime[0].Total.UnblendedCost' --output text
```

Each Cost Explorer API call (including this command) costs **$0.01**. The console pages are free.

## Done? Tell Claude

Report back:

- [ ] Your plan (Free or Paid), credits left, and the end date
- [ ] MFA works for root and for `yourname-admin`
- [ ] The `get-caller-identity` output ends with `user/yourname-admin`. You can replace the
      12-digit account number with `XXXX`.
