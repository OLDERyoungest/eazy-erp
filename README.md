# ERP设备管理系统

基于Node.js + MySQL的设备管理ERP系统，支持角色权限管理、表单录入、审批、查询、自动备份等功能。

## 功能特性

### 角色权限
- **销售**：新建录入订单，可编辑自己的待审批订单，支持查询所有订单
- **技术**：审批订单，填写系统名称和序列号，可修改所有订单
- **管理员**：最高权限，支持用户/角色管理，数据备份导入
- 支持新建角色、修改角色权限、修改密码
- 用户名支持中文

### 数据管理
- 完整的设备信息录入，包括详细配置（CPU、主板、内存、显卡等）
- 必填项校验（销售人员、设备名称、型号必填）
- 自动生成产品序列号（日期 + 型号 + 序号）
- 系统名称和序列号由技术人员审批时填写
- 支持多条件查询（销售人员、序列号、时间范围）

### 数据备份
- 每日自动备份数据库
- 支持通过Web界面手动导出备份JSON文件
- 支持重新安装后导入备份数据
- 备份保留30天自动清理

### 网络访问
- 支持局域网内所有设备通过IP+端口访问
- 响应式设计，支持PC和移动端

## 部署到Ubuntu系统

### 1. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 和 npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 MySQL
sudo apt install -y mysql-server

# 安装 git (可选，用于克隆代码)
sudo apt install -y git
```

### 2. 克隆项目代码

```bash
# 克隆项目到 /opt/erp
sudo mkdir -p /opt
cd /opt
sudo git clone <your-repo-url> erp
cd erp
```

或者上传压缩包解压：

```bash
cd /opt
sudo unzip erp.zip
cd erp
```

### 3. 安装项目依赖

```bash
sudo npm install
```

### 4. 配置数据库

```bash
# 登录 MySQL
sudo mysql

# 在 MySQL 中执行以下命令：
CREATE DATABASE IF NOT EXISTS erp_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON erp_system.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

导入数据库结构：

```bash
sudo mysql -u root -p erp_system < database.sql
```

> 默认账号：
> - 管理员 / 密码：123456
> - 销售 / 密码：123456
> - 技术 / 密码：123456
> **请登录后立即修改默认密码！**

### 5. 配置环境变量（可选）

创建 `.env` 文件：

```bash
cat > .env << EOF
DB_HOST=localhost
DB_USER=erp_user
DB_PASSWORD=your_password
DB_NAME=erp_system
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3000
EOF
```

### 6. 启动服务（使用 PM2 进程管理）

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动服务
pm2 start server.js --name erp

# 设置开机自启
pm2 startup
pm2 save
```

### 7. 设置自动每日备份

```bash
# 创建备份目录
sudo mkdir -p /var/backups/erp
sudo chmod +x scripts/backup.sh

# 编辑 crontab 设置每天凌晨2点备份
sudo crontab -e
```

在crontab中添加一行：

```
0 2 * * * /opt/erp/scripts/backup.sh >> /var/log/erp_backup.log 2>&1
```

这会每天凌晨2点自动备份，并保留30天的备份。

### 8. 配置防火墙（如果开启了UFW）

```bash
# 开放 3000 端口
sudo ufw allow 3000/tcp
```

## 访问系统

在浏览器中访问：
- 本地：`http://localhost:3000`
- 局域网：`http://<your-server-ip>:3000`

比如你的服务器IP是 192.168.1.100，那么就是 `http://192.168.1.100:3000`

同一局域网内的所有设备（电脑、手机、平板）都可以访问。

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| 管理员 | 123456 | 管理员 |
| 销售 | 123456 | 销售 |
| 技术 | 123456 | 技术 |

**请登录后立即修改默认密码！**点击右上角"修改密码"即可。

## 数据恢复

### 从SQL备份恢复：

```bash
cd /opt/erp
./scripts/restore.sh /var/backups/erp/erp_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 从JSON备份恢复（Web界面）：

1. 使用管理员账号登录
2. 进入"备份/导入"页面
3. 选择JSON备份文件，点击导入即可

## Nginx反向代理配置（可选，使用域名访问）

如果你有域名，可以配置Nginx反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 技术栈

- **后端**：Node.js + Express
- **数据库**：MySQL
- **前端**：原生JavaScript + HTML + CSS（无需构建）
- **认证**：JWT
- **密码加密**：bcryptjs

## 项目结构

```
erp/
├── server.js              # 后端主服务文件
├── package.json           # 依赖配置
├── database.sql           # 数据库初始化脚本
├── public/                # 前端静态文件
│   ├── index.html        # 主页面
│   ├── style.css         # 样式
│   └── app.js            # 前端JavaScript
├── scripts/
│   ├── backup.sh         # 自动备份脚本
│   └── restore.sh        # 恢复脚本
└── README.md             # 本文档
```

## 常见问题

### 1. 无法连接数据库？

检查：
- MySQL是否启动：`sudo systemctl status mysql`
- 数据库连接信息是否正确（用户名、密码、数据库名）
- 用户权限是否正确

### 2. 无法访问？

检查：
- 服务是否运行：`pm2 status`
- 防火墙是否开放端口：`sudo ufw status`
- 服务器IP是否正确

### 3. 忘记管理员密码怎么办？

可以通过MySQL重置，把密码重置为 `123456`：

```bash
sudo mysql erp_system -e "UPDATE users SET password = '\$2a\$10\$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6z2Xy' WHERE username = '管理员';"
```

重置后密码是 `123456`，登录后请立即修改。

### 4. 备份存在哪里？

自动SQL备份在 `/var/backups/erp/` 目录下，Web导出的JSON备份在 `backups/` 目录下。

## License

MIT
