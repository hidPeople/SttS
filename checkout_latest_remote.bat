@echo off
cd /d %~dp0
chcp 65001 > NUL

rem 最新のリモートブランチを取得してチェックアウト
git fetch

for /f "usebackq delims=" %%b in (`git for-each-ref --sort=-creatordate --format="%%(refname:strip=3)" refs/remotes/origin ^| findstr /v "HEAD"`) do (
    set "BRANCH=%%b"
    goto found
)
:found

git checkout --detach "origin/%BRANCH%"

rem 最新状態を取得
git pull --ff-only origin "%BRANCH%"

timeout /t 10