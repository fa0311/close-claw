import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

import { createStore } from "../lib/store.js";

const execFileAsync = promisify(execFile);

const claudeResultSchema = z.object({
  type: z.literal("result"),
  subtype: z.string(),
  is_error: z.boolean(),
  session_id: z.string(),
  result: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export type ClaudeOutput = {
  result: string;
  sessionId: string;
};

export type AskClaudeOptions = {
  startNew: boolean;
  effort?: string;
  model?: string;
};


const claudeStore = createStore<string>();


export const askClaude = async (
  prompt: string,
  options: AskClaudeOptions,
): Promise<ClaudeOutput> => {
  const args = ["--dangerously-skip-permissions", "--output-format", "json"];

  if (options.startNew) {
    claudeStore.set(undefined);
  }

  claudeStore.with((sessionId) => {
    args.push("--resume", sessionId);
  });

  if (options.effort) {
    args.push("--effort", options.effort);
  }

  if (options.model) {
    args.push("--model", options.model);
  }


  args.push("-p", prompt);

  const stdout = await execFileAsync("claude", args)
    .then(({ stdout }) => stdout)
    .catch((error) => {
      return error.stdout as string;
    });

  const result = parseClaudeOutput(stdout);
  claudeStore.set(result.sessionId);
  return result;
};

export const parseClaudeOutput = (stdout: string): ClaudeOutput => {
  const parsed = claudeResultSchema.parse(JSON.parse(stdout));

  if (parsed.is_error || parsed.result === undefined) {
    const detail = parsed.errors?.join("\n") ?? `(subtype: ${parsed.subtype})`;
    throw new Error(`Claude returned an error (${parsed.subtype}): ${detail}`);

  }

  return { result: parsed.result, sessionId: parsed.session_id };
};
