# Multi-stage Dockerfile to pin Node 20 and avoid Railpack/npm ci issues
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server and built assets
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

# Express reads PORT from env; default 8787
EXPOSE 8787
CMD ["node", "server/index.cjs"]
