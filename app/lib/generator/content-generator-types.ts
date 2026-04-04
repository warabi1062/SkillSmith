// content生成関数の共通基底インターフェース

export interface ContentGeneratorInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
}
