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

# Copy Backend
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
# We install production dependencies only for the runtime
WORKDIR /app/server
RUN npm install --production

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

CMD ["node", "server/dist/index.js"]
