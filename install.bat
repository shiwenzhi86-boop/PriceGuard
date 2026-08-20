@echo off
chcp 65001 >nul
echo ========================================
echo   PriceGuard 电商价格监控系统 - 安装程序
echo ========================================
echo.

:: 检查 Node.js
echo [1/4] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)
echo [成功] Node.js 版本：
node --version
echo.

:: 检查 pnpm
echo [2/4] 检查 pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [提示] 正在安装 pnpm...
    npm install -g pnpm
    if errorlevel 1 (
        echo [错误] pnpm 安装失败，请手动安装
        pause
        exit /b 1
    )
)
echo [成功] pnpm 版本：
pnpm --version
echo.

:: 安装依赖
echo [3/4] 安装依赖...
pnpm install
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [成功] 依赖安装完成
echo.

:: 启动程序
echo [4/4] 启动程序...
echo 访问地址：http://localhost:5000
echo.
pnpm dev

pause
