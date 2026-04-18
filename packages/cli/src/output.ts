import type { CliError } from "./errors";
import type { GlobalOptions } from "./types";

// 出力インターフェース
export interface Output {
  // 成功時の出力。json モードなら { ok: true, data } を JSON 出力、通常モードなら人間向け出力
  success(data: unknown): void;
  // エラー時の出力。json モードなら { ok: false, errors } を JSON 出力、通常モードなら stderr 出力
  error(errors: CliError | CliError[]): void;
}

// 出力先を差し替え可能にするための依存注入用インターフェース
export interface OutputStreams {
  stdout: { write(s: string): void };
  stderr: { write(s: string): void };
}

// デフォルトの出力先（process.stdout / process.stderr）
const defaultStreams: OutputStreams = {
  stdout: process.stdout,
  stderr: process.stderr,
};

// 出力オブジェクトを生成する
export function createOutput(
  options: Pick<GlobalOptions, "json">,
  streams: OutputStreams = defaultStreams,
): Output {
  if (options.json) {
    return {
      success(data: unknown) {
        streams.stdout.write(`${JSON.stringify({ ok: true, data })}\n`);
      },
      error(errors: CliError | CliError[]) {
        const errorArray = Array.isArray(errors) ? errors : [errors];
        streams.stdout.write(
          `${JSON.stringify({ ok: false, errors: errorArray })}\n`,
        );
      },
    };
  }

  return {
    success(data: unknown) {
      const text =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
      streams.stdout.write(`${text}\n`);
    },
    error(errors: CliError | CliError[]) {
      const errorArray = Array.isArray(errors) ? errors : [errors];
      for (const err of errorArray) {
        const contextSuffix = err.context ? ` (${err.context})` : "";
        streams.stderr.write(
          `Error [${err.type}]: ${err.message}${contextSuffix}\n`,
        );
      }
    },
  };
}
