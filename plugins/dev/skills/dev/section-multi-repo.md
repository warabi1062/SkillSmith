スキーマ定義→利用側のように、複数リポジトリにまたがる変更が必要な場合は以下の手順に従う。

### ブランチ作成

各リポジトリでベースブランチの判定（develop優先）を行ったうえで同名のfeatureブランチを作成する:

```bash
# 依存される側（スキーマ定義等）
cd /path/to/upstream-repo
git checkout {ベースブランチ} && git pull
git checkout -b feature/{ID}-{slug}

# 依存する側（利用側）
cd /path/to/downstream-repo
git checkout {ベースブランチ} && git pull
git checkout -b feature/{ID}-{slug}
```

### 実装順序

依存関係に従って実装する。典型的なパターン:

1. 依存される側（スキーマ/API定義等）を先に実装
2. 生成ファイルがある場合は再生成
3. 依存する側に生成ファイルをコピーして実装

### PR作成

各リポジトリで個別にcreate-pr-agentを呼び出す。その際、相互参照と依存関係（どちらを先にmergeすべきか）を渡す。