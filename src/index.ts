import "dotenv/config";

import { readFileSync } from "node:fs";
import { type EffortLevel, type Options, query } from "@anthropic-ai/claude-agent-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { Client, type Interaction, SlashCommandBuilder } from "discord.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { createProgressLogger } from "./lib/progressLogger.js";
import { splitMessage } from "./lib/utils.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const loadClaudeChoices = async () => {
  const models = await anthropic.models.list();

  const modelChoices = models.data
    .filter((model) => model.capabilities?.effort?.supported)
    .map((model) => ({ name: model.display_name, value: model.id }));

  const effortChoices = models.data.map((model) => ({ name: model.display_name, value: model.id }));

  return { modelChoices, effortChoices };
};

const client = new Client({ intents: ["Guilds"] });

let lastSessionId: string | undefined;

const mcpServers = await (async () => {
  const rawConfig = readFileSync(config.MCP_SERVERS_CONFIG_PATH, "utf8");
  return JSON.parse(rawConfig) as Options["mcpServers"];
})().catch(() => {
  return undefined;
});

client.on("interactionCreate", async (interaction: Interaction) => {
  await handleInteraction(interaction).catch(async (error: unknown) => {
    logger.error("Interaction failed", error);

    if (!interaction.isRepliable()) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    const content = `Claudeの実行に失敗しました:\n${message}`;

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  });
});

const handleInteraction = async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "claude") {
    return;
  }

  if (interaction.user.id !== config.ADMIN_USER_ID) {
    return;
  }

  await interaction.deferReply();

  const prompt = interaction.options.getString("prompt", true);
  const startNew = interaction.options.getBoolean("new") ?? false;
  const effort = interaction.options.getString("effort") as EffortLevel | null;
  const model = interaction.options.getString("model") ?? undefined;

  const options: Options = {
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["user", "project", "local"],
    effort: effort ?? undefined,
    model,
    tools: { type: "preset", preset: "claude_code" },
    skills: "all",
    resume: startNew ? undefined : lastSessionId,
    mcpServers: mcpServers,
  };

  await createProgressLogger<string>(
    async (messages) => {
      await interaction.editReply(messages.join("\n"));
    },
    async (logger) => {
      for await (const message of query({ prompt, options })) {
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if (block.type === "tool_use") {
              logger.add(`- ${block.name}`);
            }
          }
        } else if (message.type === "result") {
          if (message.subtype === "success") {
            lastSessionId = message.session_id;
            const chunks = splitMessage(message.result);
            await logger.stop();
            await interaction.editReply(chunks[0]);

            for (const chunk of chunks.slice(1)) {
              await interaction.followUp(chunk);
            }
          } else {
            throw new Error(message.errors.join("\n"));
          }
        }
      }
    },
  );
};

client.once("ready", async (readyClient) => {
  const { modelChoices, effortChoices } = await loadClaudeChoices();

  const claudeCommand = new SlashCommandBuilder()
    .setName("claude")
    .setDescription("Claude Codeを呼び出します")
    .addStringOption((option) => {
      return option.setName("prompt").setDescription("Claudeに渡す内容").setRequired(true);
    })
    .addBooleanOption((option) => {
      return option.setName("new").setDescription("既存の会話を継続せず、新しいセッションを開始します");
    })
    .addStringOption((option) => {
      return option
        .setName("effort")
        .setDescription("推論努力レベル")
        .addChoices(...effortChoices);
    })
    .addStringOption((option) => {
      return option
        .setName("model")
        .setDescription("モデル")
        .addChoices(...modelChoices);
    });

  await readyClient.application.commands.set([claudeCommand]);
  logger.info(`Ready: ${readyClient.user.tag}`);
});

client.on("error", (error) => logger.error("Discord client error", error));
process.on("unhandledRejection", (reason) => logger.error("Unhandled rejection", reason));

client.login(config.DISCORD_TOKEN).catch((error: unknown) => logger.error("Discord login failed", error));
