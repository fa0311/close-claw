import { Client, type Interaction, SlashCommandBuilder } from "discord.js";

import { askClaude } from "../claude/claude.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { splitMessage } from "../lib/utils.js";

const claudeCommand = new SlashCommandBuilder()
  .setName("claude")
  .setDescription("Claude CLIを呼び出します")
  .addStringOption((option) =>
    option.setName("prompt").setDescription("Claudeに渡す内容").setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName("new")
      .setDescription("既存の会話を継続せず、新しいセッションを開始します"),
  )
  .addStringOption((option) =>
    option
      .setName("effort")
      .setDescription("推論努力レベル")
      .addChoices(
        { name: "low", value: "low" },
        { name: "medium", value: "medium" },
        { name: "high", value: "high" },
        { name: "x-high", value: "x-high" },
        { name: "max", value: "max" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("model")
      .setDescription("モデル")
      .addChoices(
        { name: "haiku", value: "haiku" },
        { name: "sonnet", value: "sonnet" },
        { name: "opus", value: "opus" },
      ),
  );

export const createClient = () => {
  const client = new Client({ intents: ["Guilds"] });

  client.once("ready", async (readyClient) => {
    await readyClient.application.commands.set([claudeCommand]);
    logger.info(`Ready: ${readyClient.user.tag}`);
  });

  client.on("interactionCreate", handleInteraction);

  return client;
};

const handleInteraction = async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "claude") {
    return;
  }

  if (config.ADMIN_USER_IDS !== interaction.user.id) {
    return;
  }


  await interaction.deferReply();

  const prompt = interaction.options.getString("prompt", true);
  const startNew = interaction.options.getBoolean("new") ?? false;
  const effort = interaction.options.getString("effort") ?? undefined;
  const model = interaction.options.getString("model") ?? undefined;

  const { result } = await askClaude(prompt, { startNew, effort, model });

  const chunks = splitMessage(result);
  await interaction.editReply(chunks[0]);

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp(chunk);
  }
};
