FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git python3 python3-pip jq \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && chown node:node /app

USER node

RUN curl -fsSL https://claude.ai/install.sh | bash -s stable

ENV PATH="/home/node/.local/bin:${PATH}"

RUN npx -y skills add --global fa0311/twitter_api_safe_relay_skills -y

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

COPY --chown=node:node . .

CMD ["pnpm", "start"]