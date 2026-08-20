@echo off
chcp 65001 >nul
echo ========================================
echo   PriceGuard 电商价格监控系统 - 更新程序
echo ========================================
echo.

:: 检查 git
echo [1/3] 检查 Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Git，请先安装 Git
    echo 下载地址：https://git-scm.com/
    pause
    exit /b 1
)
echo [成功] Git 版本：
git --version
echo.

:: 拉取最新代码
echo [2/3] 拉取最新代码...
git pull origin main
if errorlevel 1 (
    echo [错误] 代码拉取失败，请检查网络连接
    pause
    exit /b 1
)
echo [成功] 代码更新完成
echo.

:: 安装依赖
echo [3/3] 安装依赖...
pnpm install
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [成功] 依赖安装完成
echo.

echo ========================================
echo   更新完成！请重启程序。
echo ========================================
pause
