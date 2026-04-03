@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%.tools\node-v22.22.1-win-x64"
set "BUN_DIR=%ROOT%.tools\bun-runtime"
set "SKILL_DIR=%ROOT%.tools\nano-banana-2-skill-main"
set "PATH=%NODE_DIR%;%BUN_DIR%;%PATH%"

"%BUN_DIR%\bun.cmd" run "%SKILL_DIR%\src\cli.ts" %*
