レビュー結果を `~/claude-code-data/workflows/{チケットID}/triage-review.md` に保存する。

ファイルのフォーマット:
```markdown
## Triage Plan レビュー結果

### 判定: {PASS / NEEDS_REVISION}

### 指摘事項
（NEEDS_REVISIONの場合のみ）

#### [{種別: must/imo/question}][{重要度: critical/major/minor}] {指摘の概要}
- must: 変えないと問題がある指摘
- imo: 問題はないが自分ならこうする、という提案
- question: 意図や背景の確認（回答によっては指摘に変わる可能性がある）
- 対象: {計画のどの部分か}
- 問題: {何が問題か}
- 方向性: {どういう方向で見直すべきか。答えが明確な場合のみ具体的な修正を書いてよい}
```

保存後、triager と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

- NEEDS_REVISION を送った場合 → R6 へ進み、triager の修正通知を待つ
- PASS を送った場合 → R7 へ進む