# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建依赖 (better-sqlite3 需要 python3, make, g++)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install

# 复制源码并构建前端
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

# Add labels to connect package to repository
LABEL org.opencontainers.image.source=https://github.com/binbankm/Sub-One
LABEL org.opencontainers.image.description="Sub-One subscription management"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app

# 环境变量
ENV PORT=3055
ENV NODE_ENV=production

# 复制 package.json
COPY package*.json ./

# 只安装运行必要的依赖
# 另外需要安装 python3, make, g++ 以便在运行时安装带有原生模块的依赖（或者确保在这里编译成功）
RUN apk add --no-cache python3 make g++ && \
    npm install --omit=dev && \
    npm install tsx && \
    apk del python3 make g++ 

# 复制构建产物和必要的后端源码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/docker ./docker

# 创建数据目录挂载点
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3055

# 启动脚本
CMD ["npx", "-y", "tsx", "docker/docker-server.ts"]
