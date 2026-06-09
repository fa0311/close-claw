import "dotenv/config";

import { Client, SlashCommandBuilder } from "discord.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const { DISCORD_TOKEN } = z
  .object({
    DISCORD_TOKEN: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
  })
  .parse(process.env);

const client = new Client({ intents: ["Guilds"] });

client.once("ready", async (readyClient) => {
  await readyClient.application.commands.set([
    new SlashCommandBuilder()
      .setName("claude")
      .setDescription("Claude CLIを呼び出します")
      .addStringOption((option) =>
        option
          .setName("prompt")
          .setDescription("Claudeに渡す内容")
          .setRequired(true),
      ),
  ]);

  console.log(`Ready: ${readyClient.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "claude")
    return;

  await interaction.deferReply();

  const prompt = interaction.options.getString("prompt", true);
  const text = await askClaude(prompt).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return `Claude CLI failed:\n${message}`;
  });

  const chunks = splitMessage(text);
  await interaction.editReply(chunks[0]);

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp(chunk);
  }
});

const askClaude = async (prompt: string) => {
  const { stdout } = await execFileAsync("claude", [
    "--dangerously-skip-permissions",
    "-p",
    prompt,
  ]);

  return stdout;
};

const splitMessage = (text: string) => {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += 1900) {
    chunks.push(text.slice(i, i + 1900));
  }

  return chunks.length > 0 ? chunks : ["(empty output)"];
};

client.login(DISCORD_TOKEN);
