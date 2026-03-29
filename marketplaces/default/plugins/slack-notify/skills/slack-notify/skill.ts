// slack-notify スキル: Slack DMでの通知送信

import { WorkerSkill, bash } from "../../../../app/lib/types";

const slackNotifySkill = new WorkerSkill({
  name: "slack-notify",
  description: "ユーザーにSlack DMで通知を送るスキル",
  allowedTools: [bash("curl *")],
  content: `# Slack Notify

ユーザーにSlack DMで通知を送る。

## 入力

- **メッセージ**: 送信するテキスト

## 作業詳細

### Step 1: 環境変数の確認

\`SLACK_BOT_TOKEN\` と \`SLACK_USER_ID\` が設定されているか確認する。
どちらかが未設定の場合は通知をスキップし、その旨をログに残す。

### Step 2: 通知送信

\`\`\`bash
curl -s -X POST https://slack.com/api/chat.postMessage \\
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\\"channel\\":\\"$SLACK_USER_ID\\",\\"text\\":\\"\${メッセージ}\\"}"
\`\`\`

### Step 3: 結果確認

レスポンスの \`ok\` フィールドを確認する。失敗した場合はエラーを報告するが、ワークフローは中断しない（通知は best-effort）。`,
});

export default slackNotifySkill;
