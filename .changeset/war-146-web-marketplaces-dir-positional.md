---
"@warabi1062/skillsmith": patch
"@warabi1062/skillsmith-viewer": patch
---

`skillsmith web` が位置引数で marketplaces ディレクトリを受け取れるようになりました（`skillsmith web [marketplaces-dir]`）。引数を省略した場合は従来通り `./marketplaces` を参照します。

viewer の `start()` API は破壊的変更です。`cwd` オプションが削除され、解決済みの `marketplacesDir` を受け取る形に変わりました（0.1.x 帯のため patch リリースとして扱います）。
