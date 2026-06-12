# close-claw

A tiny Discord app that exposes Claude Code through a `/claude` slash command.

## Setup

Required environment variables:

- `DISCORD_TOKEN`
- `ANTHROPIC_API_KEY`
- `ADMIN_USER_ID`

Optional environment variables:

- `MCP_SERVERS_CONFIG_PATH` - path to the MCP servers JSON. Defaults to `mcp-servers.config.json`.

MCP server config lives in `mcp-servers.config.json`. The default config connects Claude to the Playwright MCP server at `http://playwright:8931/mcp`.

Run with Docker Compose to start the Discord app and Playwright MCP together:

```sh
docker compose up --build
```

## Commands

- `pnpm start` - run the Discord bot
- `pnpm check` - run TypeScript and Biome checks
- `pnpm format` - format files with Biome
- `pnpm lint` - run Biome lint rules
