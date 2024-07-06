@echo off

REM 切换到脚本执行目录
cd /d %~dp0

REM 切换到 vue 目录，并执行 yarn build
cd ./vue
call yarn
call yarn build:frontend

REM 切换到 ../electron 目录，并执行 yarn build
cd ../electron
call yarn
call yarn build:electron

REM 复制 dist/win-unpacked 的内容到 D:\Programs\KeeNote
xcopy /E /I /Y dist\win-unpacked D:\Programs\KeeNote

pause
