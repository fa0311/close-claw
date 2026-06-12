import "dotenv/config";

import { config } from "./config.js";
import { createClient } from "./discord/client.js";
import { logger } from "./lib/logger.js";

const client = createClient();

client.on("error", (error) => logger.error("Discord client error", error));
process.on("unhandledRejection", (reason) => logger.error("Unhandled rejection", reason));

client.login(config.DISCORD_TOKEN);
