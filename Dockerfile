# Multi-stage Dockerfile to pin Node 20 and avoid Railpack/npm ci issues
FROM node:20 AS build
WORKDIR /app

# Pin npm to v9 to avoid known npm ci bug
RUN npm i -g npm@9

# Install dependencies (including dev)
COPY package.json ./
RUN npm install

# Copy source and build frontend
COPY . .
RUN npm run build

# Runtime image
FROM node:20 AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Use node_modules from build and prune dev deps
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
RUN npm prune --omit=dev

# Copy server and built assets
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

# Express reads PORT from env; default 8787
EXPOSE 8787
CMD ["node", "server/index.cjs"]
