@echo off
REM 上传项目文件到Ubuntu服务器脚本
echo 正在上传项目文件到 192.168.0.100...
echo.
echo 请输入root用户密码当提示时。
echo.

scp -P 22 ^
    server.js ^
    package.json ^
    package-lock.json ^
    database.sql ^
    deploy.sh ^
    root@192.168.0.100:/tmp/

scp -P 22 -r public root@192.168.0.100:/tmp/
scp -P 22 -r scripts root@192.168.0.100:/tmp/

echo.
echo 上传完成！
pause
