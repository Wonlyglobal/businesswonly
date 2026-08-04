@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 获客系统 · 项目终端
cls
echo ============================================================
echo   WONLY 获客系统   %CD%
echo   repo: chloe19980401/businesswonly  domain: business.foreverdoodle.com
echo ============================================================
where git >nul 2>nul
if %errorlevel%==0 (
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do echo   当前分支: %%b
  echo   未提交改动:
  git status -s
)
echo.
echo   ---- 常用命令 ----
echo     push-only.bat              一键部署上线（自动生成 /api 后 push）
echo     node crawler\gen-api.mjs   只重新生成背调静态接口
echo     npm run dev                本地预览
echo.
where claude >nul 2>nul
if %errorlevel%==0 (
  echo   ---- 检测到 Claude Code 命令行 ----
  echo     claude -c    在本项目里继续上一次对话（恢复上下文）
  echo     claude       新开一个对话
  echo.
)
echo   窗口已停在项目目录，直接敲命令即可。关掉窗口不影响云端对话。
echo ------------------------------------------------------------
cmd /k
