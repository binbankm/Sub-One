# Sub-One 部署指南

本指南将帮助您将 Sub-One 部署到 VPS 服务器上。

## 1. 准备工作

确保您的 VPS 满足以下条件：
*   操作系统：Ubuntu 20.04/22.04, Debian 10/11, CentOS 7+ 等主流 Linux 发行版。
*   已安装 Git。
*   已安装 Docker 和 Docker Compose。

### 安装 Docker (如果尚未安装)

在您的 VPS 上运行以下命令（适用于 Ubuntu/Debian）：

```bash
# 更新系统
sudo apt-get update

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. 获取代码

您有两种方式将代码上传到 VPS：

### 方式 A：使用 Git (推荐)

1.  在您的本地电脑上，将代码推送到 GitHub 或 GitLab 等仓库。
2.  在 VPS 上克隆仓库：

```bash
git clone <您的仓库地址>
cd Sub-One
```

### 方式 B：直接上传文件

使用 SFTP 工具（如 FileZilla, WinSCP）将整个 `Sub-One` 文件夹上传到 VPS。
**注意**：不要上传 `node_modules` 文件夹，这会非常慢且没有必要。

## 3. 启动服务

进入项目目录，运行以下命令构建并启动服务：

```bash
# 进入目录
cd Sub-One

# 构建并后台启动
docker compose up -d --build
```

Docker 会自动下载所需的镜像，构建前端和后端，并启动服务。

## 4. 验证部署

1.  打开浏览器，访问 `http://<您的VPS_IP>:3055`。
2.  您应该能看到 Sub-One 的登录界面。
3.  默认密码为 `admin`。

## 5. 常见问题

### 端口无法访问
如果无法访问，请检查 VPS 的防火墙设置，确保 **3055** 端口已开放。

```bash
# Ubuntu (UFW)
sudo ufw allow 3055/tcp

# CentOS (Firewalld)
sudo firewall-cmd --zone=public --add-port=3055/tcp --permanent
sudo firewall-cmd --reload
```

### 查看日志
如果服务运行异常，可以查看日志进行排查：

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app
```

### 更新代码
如果您更新了代码，只需在 VPS 上执行：

```bash
# 拉取最新代码 (如果是 Git)
git pull

# 重建并重启容器
docker compose up -d --build
```
