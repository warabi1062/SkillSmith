import {
  addAgentTeamMember,
  removeAgentTeamMember,
} from "../../app/lib/plugins.server";
import { ValidationError } from "../../app/lib/validations";
import { parseCommandArgs } from "../command-utils";
import { createOutput } from "../output";
import type { OutputStreams } from "../output";
import { registerCommand } from "../router";
import type { CommandContext } from "../types";

// テスト用に出力先を差し替え可能にする
let outputStreams: OutputStreams | undefined;

// 出力先を設定する（テスト用）
export function setOutputStreams(streams: OutputStreams | undefined): void {
  outputStreams = streams;
}

// team add: チームメンバーを追加する
export async function handleAdd(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    team: { type: "string" },
    member: { type: "string" },
  });

  const team = values.team as string | undefined;
  if (!team) {
    out.error(
      "--team is required. Usage: skillsmith team add --team <componentId> --member <componentId>",
    );
    return 1;
  }

  const member = values.member as string | undefined;
  if (!member) {
    out.error(
      "--member is required. Usage: skillsmith team add --team <componentId> --member <componentId>",
    );
    return 1;
  }

  try {
    const result = await addAgentTeamMember(team, {
      memberComponentId: member,
    });

    if (ctx.options.json) {
      out.success(result);
      return 0;
    }

    out.success(`Added team member: ${result.id}`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// team remove: チームメンバーを削除する
export async function handleRemove(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    team: { type: "string" },
    member: { type: "string" },
  });

  const team = values.team as string | undefined;
  if (!team) {
    out.error(
      "--team is required. Usage: skillsmith team remove --team <componentId> --member <memberId>",
    );
    return 1;
  }

  const member = values.member as string | undefined;
  if (!member) {
    out.error(
      "--member is required. Usage: skillsmith team remove --team <componentId> --member <memberId>",
    );
    return 1;
  }

  try {
    // 注意: 第1引数が memberId、第2引数が agentTeamComponentId
    const result = await removeAgentTeamMember(member, team);

    if (ctx.options.json) {
      out.success(result);
      return 0;
    }

    out.success(`Removed team member: ${result.id}`);
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// Team コマンド群をルーターに登録する
export function registerTeamCommands(): void {
  registerCommand({
    entity: "team",
    action: "add",
    description: "Add a member to an agent team",
    handler: handleAdd,
  });

  registerCommand({
    entity: "team",
    action: "remove",
    description: "Remove a member from an agent team",
    handler: handleRemove,
  });
}
