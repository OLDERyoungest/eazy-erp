#!/bin/bash
# ERP系统自动化部署脚本

set -e

echo "===== ERP系统部署开始 ====="

# 1. 更新系统包
echo ">>> 更新系统包..."
apt update && apt upgrade -y

# 2. 安装Node.js
if ! command -v node &> /dev/null; then
    echo ">>> 安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 3. 安装MySQL
if ! command -v mysql &> /dev/null; then
    echo ">>> 安装MySQL..."
    apt install -y mysql-server mysql-client
fi

# 4. 安装PM2进行进程管理
echo ">>> 安装PM2..."
npm install -g pm2

# 5. 创建项目目录
echo ">>> 创建项目目录..."
mkdir -p /opt/erp
cd /opt/erp

echo ""
echo ">>> 请先将本地项目文件上传到 /opt/erp 目录"
echo ">>> 上传完成后按回车继续..."
read -p ""

# 6. 安装项目依赖
echo ">>> 安装项目依赖..."
npm install

# 7. 配置MySQL
echo ">>> 配置MySQL..."
echo "请输入MySQL root密码（如果刚安装没有密码直接回车）:"
read -s MYSQL_ROOT_PWD
echo

if [ -z "$MYSQL_ROOT_PWD" ]; then
    # 无密码，创建数据库
    mysql -e "CREATE DATABASE IF NOT EXISTS erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql erp < database.sql
else
    # 有密码
    mysql -uroot -p"$MYSQL_ROOT_PWD" -e "CREATE DATABASE IF NOT EXISTS erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -uroot -p"$MYSQL_ROOT_PWD" erp < database.sql
fi

# 8. 修改数据库配置（如果需要）
echo ">>> 检查数据库连接配置..."
# server.js中默认连接是 localhost:3306, 用户名root, 空密码
# 如果你的MySQL配置不同，请手动修改server.js

# 9. 启动应用使用PM2
echo ">>> 启动ERP应用..."
pm2 start server.js --name erp
pm2 startup
pm2 save

# 10. 开放端口
echo ">>> 开放3000端口..."
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp
    echo "已开放3000端口"
fi

echo ""
echo "===== 部署完成 ====="
echo "ERP系统已经启动，可以访问: http://服务器IP:3000"
echo "默认账号:"
echo "  管理员: admin / 123456"
echo "  销售: sales / 123456"
echo "  技术: tech / 123456"
