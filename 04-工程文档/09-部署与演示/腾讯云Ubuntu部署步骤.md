# 腾讯云 Ubuntu 演示部署步骤

**版本号**: v1.0  
**日期**: 2026-05-28  
**部署目标**: 腾讯云 Ubuntu 演示环境  
**公网访问地址**: `http://122.51.95.83:8081`  
**适用工程**: `release-train`

---

## 一、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-28 | 新增腾讯云 Ubuntu 演示环境部署步骤、验证记录和运维命令 |

---

## 二、部署结果

本次部署已完成，系统通过 Nginx 在服务器 `8081` 端口对外提供前端访问，后端由 PM2 守护运行，PostgreSQL 和 Redis 由 Docker Compose 启动。

| 项目 | 配置 |
|------|------|
| 服务器 IP | `122.51.95.83` |
| 登录账号 | `ubuntu` |
| 前端入口 | `http://122.51.95.83:8081` |
| 健康检查 | `http://122.51.95.83:8081/api/health` |
| Swagger 文档 | `http://122.51.95.83:8081/documentation` |
| 应用目录 | `/home/ubuntu/release-train-mvp/release-train` |
| 前端静态目录 | `/var/www/release-train` |
| 后端进程名 | `release-train-server` |
| 后端端口 | `3000` |
| 数据库端口 | `127.0.0.1:5432` |
| Redis 端口 | `127.0.0.1:6379` |

安全说明：

- 腾讯云安全组对外放通 `22/tcp` 和 `8081/tcp`。
- PostgreSQL 和 Redis 仅绑定 `127.0.0.1`，不对公网暴露。
- Coze API Key、JWT Secret、数据库密码、Redis 密码仅写入服务器 `.env`，本文档不记录明文密钥。
- 当前为演示部署，暂无域名和 HTTPS 证书；正式生产环境应补充域名、HTTPS 和密钥轮换。

---

## 三、服务器环境准备

### 3.1 安装基础组件

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg nginx docker.io

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo systemctl enable --now docker
sudo systemctl enable --now nginx

sudo corepack enable
corepack prepare pnpm@9.15.4 --activate

sudo npm install -g pm2
```

### 3.2 安装 Docker Compose 插件

```bash
sudo apt-get install -y docker-compose-v2
```

### 3.3 配置 Docker 镜像加速

服务器拉取 Docker Hub 镜像时可能超时，可配置腾讯云镜像源。

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF

sudo systemctl restart docker
```

---

## 四、项目发布步骤

### 4.1 创建服务器目录

```bash
mkdir -p /home/ubuntu/release-train-mvp
```

### 4.2 同步项目文件

在本地执行：

```bash
rsync -az --delete \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.log' \
  --exclude 'coverage/' \
  --exclude '.cache/' \
  --exclude 'test-results/' \
  --exclude 'playwright-report/' \
  --exclude '__pycache__/' \
  -e "ssh -i ~/.ssh/safeoutput_demo_ed25519 -o IdentitiesOnly=yes" \
  release-train/ \
  ubuntu@122.51.95.83:/home/ubuntu/release-train-mvp/release-train/
```

### 4.3 创建服务器 `.env`

在服务器 `/home/ubuntu/release-train-mvp/release-train/.env` 创建私有环境变量文件。

```bash
NODE_ENV=production
SERVER_PORT=3000
CLIENT_PORT=8081
POSTGRES_DB=release_train
POSTGRES_USER=admin
POSTGRES_PASSWORD=<服务器私有密码>
DATABASE_URL=postgresql://admin:<服务器私有密码>@127.0.0.1:5432/release_train
REDIS_PASSWORD=<服务器私有密码>
REDIS_URL=redis://:<服务器私有密码>@127.0.0.1:6379
JWT_SECRET=<32字符以上随机密钥>
JWT_EXPIRES_IN=24h
CORS_ORIGINS=http://122.51.95.83:8081
LOG_DIR=/home/ubuntu/release-train-mvp/logs
COZE_API_KEY=<服务器私有Coze Key>
COZE_WORKFLOW_ID=<Coze工作流ID>
COZE_BASE_URL=https://api.coze.cn
RATE_LIMIT_MAX=1000
```

创建日志目录和 Prisma CLI 环境变量链接：

```bash
mkdir -p /home/ubuntu/release-train-mvp/logs
chmod 700 /home/ubuntu/release-train-mvp/logs

cd /home/ubuntu/release-train-mvp/release-train
ln -sfn ../../.env apps/server/.env
```

---

## 五、数据库与构建步骤

### 5.1 限制数据库端口仅本机访问

服务器部署副本中的 `docker-compose.yml` 需要将端口改为本机绑定。

```yaml
services:
  postgres:
    ports: ["127.0.0.1:5432:5432"]

  redis:
    ports: ["127.0.0.1:6379:6379"]
```

### 5.2 安装依赖

```bash
cd /home/ubuntu/release-train-mvp/release-train
pnpm install --frozen-lockfile
```

### 5.3 启动基础设施

```bash
cd /home/ubuntu/release-train-mvp/release-train
sudo docker compose pull postgres redis
sudo docker compose up -d postgres redis
```

### 5.4 初始化数据库

```bash
cd /home/ubuntu/release-train-mvp/release-train
pnpm db:generate
pnpm db:push
pnpm --filter server db:seed
```

### 5.5 构建前后端

```bash
cd /home/ubuntu/release-train-mvp/release-train
pnpm build:shared
pnpm build:server
pnpm build:web
```

构建说明：

- `pnpm build:web` 当前会出现前端 chunk 体积超过 500 kB 的警告，不影响演示访问。
- 当前后端 `dist/main.js` 存在 Node ESM 扩展名兼容问题，因此演示部署使用 PM2 运行 `tsx src/main.ts`。

---

## 六、后端与 Nginx 启动步骤

### 6.1 使用 PM2 启动后端

```bash
cd /home/ubuntu/release-train-mvp/release-train

pm2 delete release-train-server || true
pm2 start pnpm \
  --name release-train-server \
  --cwd /home/ubuntu/release-train-mvp/release-train \
  -- --filter server exec tsx src/main.ts

pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 6.2 发布前端静态文件

```bash
sudo rm -rf /var/www/release-train
sudo mkdir -p /var/www/release-train
sudo cp -a /home/ubuntu/release-train-mvp/release-train/apps/web/dist/. /var/www/release-train/
sudo chown -R www-data:www-data /var/www/release-train
```

### 6.3 配置 Nginx

创建 `/etc/nginx/sites-available/release-train`。

```nginx
server {
    listen 8081;
    server_name 122.51.95.83;

    root /var/www/release-train;
    index index.html;

    access_log /var/log/nginx/release-train-access.log;
    error_log /var/log/nginx/release-train-error.log;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /documentation {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置：

```bash
sudo ln -sfn /etc/nginx/sites-available/release-train /etc/nginx/sites-enabled/release-train
sudo nginx -t
sudo systemctl reload nginx
```

说明：由于当前演示环境暂无 HTTPS，Nginx 给后端转发 `X-Forwarded-Proto: https`，用于兼容后端生产模式下的 HTTPS 强制逻辑。

---

## 七、验证步骤

### 7.1 进程与容器验证

```bash
pm2 status

cd /home/ubuntu/release-train-mvp/release-train
sudo docker compose ps

sudo nginx -t
sudo ss -ltnp | grep -E ':(3000|5432|6379|8081)'
```

期望结果：

- `release-train-server` 状态为 `online`。
- PostgreSQL 端口为 `127.0.0.1:5432->5432/tcp`。
- Redis 端口为 `127.0.0.1:6379->6379/tcp`。
- Nginx 监听 `0.0.0.0:8081`。

### 7.2 健康检查

```bash
curl -i http://122.51.95.83:8081/api/health
```

期望返回：

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### 7.3 页面验证

```bash
curl -I http://122.51.95.83:8081/login
curl -I http://122.51.95.83:8081/documentation
```

期望均返回 `200 OK`。

### 7.4 登录接口验证

```bash
curl -X POST http://127.0.0.1:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"puhuiqianduan_ba","password":"123456"}'
```

期望返回：

- `success: true`
- 用户角色为 `BA`
- 响应中包含 JWT token

---

## 八、常用运维命令

### 8.1 查看服务状态

```bash
pm2 status
sudo docker compose ps
sudo systemctl status nginx
```

### 8.2 查看日志

```bash
pm2 logs release-train-server --lines 100
sudo tail -f /var/log/nginx/release-train-access.log
sudo tail -f /var/log/nginx/release-train-error.log
```

### 8.3 重启服务

```bash
pm2 restart release-train-server
sudo systemctl reload nginx
sudo docker compose restart postgres redis
```

### 8.4 重新发布前端

```bash
cd /home/ubuntu/release-train-mvp/release-train
pnpm build:web

sudo rm -rf /var/www/release-train
sudo mkdir -p /var/www/release-train
sudo cp -a apps/web/dist/. /var/www/release-train/
sudo chown -R www-data:www-data /var/www/release-train
sudo systemctl reload nginx
```

---

## 九、回滚步骤

### 9.1 回滚前端静态文件

如果有历史静态备份，可恢复 `/var/www/release-train`。

```bash
sudo rm -rf /var/www/release-train
sudo cp -a /var/www/release-train-backup/. /var/www/release-train/
sudo chown -R www-data:www-data /var/www/release-train
sudo systemctl reload nginx
```

### 9.2 回滚后端代码

```bash
cd /home/ubuntu/release-train-mvp/release-train
git checkout <上一个稳定提交>
pnpm install --frozen-lockfile
pnpm build:shared
pm2 restart release-train-server
```

### 9.3 停止演示环境

```bash
pm2 stop release-train-server
sudo systemctl stop nginx

cd /home/ubuntu/release-train-mvp/release-train
sudo docker compose stop postgres redis
```

---

## 十、已知限制与后续建议

- 当前演示环境使用公网 IP 和 `8081` 端口访问，未配置 HTTPS。
- 后端暂以 `tsx src/main.ts` 运行，后续建议修复 TypeScript ESM 构建产物的 import 扩展名问题，再切换为 `node dist/main.js`。
- 当前 Coze Key 已在历史工程材料中出现过，正式生产前建议轮换密钥并清理历史记录。
- 前端构建产物存在大 chunk 警告，后续可通过路由级动态导入拆分。
- PostgreSQL 和 Redis 已限制为本机端口，但腾讯云安全组也应保持不放通 `5432` 和 `6379`。
