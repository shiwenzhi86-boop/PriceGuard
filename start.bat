@echo off
chcp 65001 >nul
echo ========================================
echo   PriceGuard 电商价格监控系统 - 启动程序
echo ========================================
echo.

:: 检查是否已安装依赖
if not exist node_modules (
    echo [提示] 首次运行，正在安装依赖...
    pnpm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 依赖安装完成
    echo.
)

:: 启动程序
echo 启动程序...
echo 访问地址：http://localhost:5000
echo.
pnpm dev

pause
