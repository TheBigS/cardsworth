# Stage 1: Build the SPA
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Node + Playwright runtime (serves dist/ and the render API)
# The Playwright image ships Chromium plus all required system libraries.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Install runtime deps (express, playwright, js-yaml) + tsx to run server.ts.
# tsx is installed globally so NODE_ENV=production (which omits devDependencies)
# doesn't skip it; it's genuinely required to run the TypeScript server.
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx@^4.19.0

# Copy the server and the built SPA (dist already bundles fonts/favicon).
COPY server.ts ./
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
