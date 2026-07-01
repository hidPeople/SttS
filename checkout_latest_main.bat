@echo off
cd /d %~dp0
chcp 65001 > NUL

rem 最新のmainブランチを取得してチェックアウト
git fetch

for /f "usebackq delims=" %%r in (`git for-each-ref --sort=-creatordate --format="%%(refname)" refs/remotes ^| findstr /R "/main$"`) do (
    set "REF=%%r"
    goto found
)
:found
for /f "tokens=3,* delims=/" %%a in ("%REF%") do (
    set "REMOTE=%%a"
    set "REMOTE_BRANCH=%%b"
)

rem 既存のローカルブランチをチェックアウト
git checkout main 2>NUL
if errorlevel 1 git checkout master

rem 最新状態を取得
git pull %REMOTE% %REMOTE_BRANCH%

timeout /t 10