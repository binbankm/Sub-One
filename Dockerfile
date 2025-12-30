FROM node:20-alpine AS builder

WORKDIR /app

# Install Frontend Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy Source
COPY . .

# Build Frontend
RUN npm run build

# Install Backend Dependencies and Build
WORKDIR /app/server
RUN npm install
RUN npm run build

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Copy Backend (compiled files include full structure due to rootDir:  "..")
# The server/dist folder contains: server/backend/*.js and lib/**/*.js
COPY --from=builder /app/server/dist ./server/dist

# Install production dependencies at root level to ensure all modules can find them
# This fixes the issue where lib/shared/generators/*.js cannot find modules installed in server/node_modules
COPY --from=builder /app/server/package.json ./package.json
RUN npm install --production

# Move files to correct location (flattening the structure a bit if needed)
# Currently server/dist contains "server" and "lib", we want them in /app
RUN cp -r server/dist/* . && rm -rf server/dist

# Copy Frontend Build
WORKDIR /app
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV PORT=3055
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

EXPOSE 3055

CMD ["node", "server/backend/index.js"]
