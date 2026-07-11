@echo off
setlocal

set "NODE_DIR=C:\Users\Administrator\AppData\Local\Programs\nodejs\node-v26.5.0-win-x64"
set "CLI=C:\Users\Administrator\.codex\packages\lark-mcp\node_modules\@larksuiteoapi\lark-mcp\dist\cli.js"
set "SCOPES=offline_access,docs:doc:readonly,docs:document.content:read,docx:document:readonly,wiki:wiki:readonly,wiki:node:read,wiki:node:retrieve,wiki:space:read,wiki:space:retrieve,docs:document:import,docs:permission.member:create,docs:permission.member:retrieve,contact:user:search,contact:user.id:readonly,contact:user.basic_profile:readonly,task:task:write,task:task:read,approval:instance,approval:approval:readonly,approval:task"

if "%LARK_APP_ID%"=="" (
  echo LARK_APP_ID is not set.
  exit /b 2
)

if "%LARK_APP_SECRET%"=="" (
  echo LARK_APP_SECRET is not set.
  exit /b 2
)

"%NODE_DIR%\node.exe" "%CLI%" login -a "%LARK_APP_ID%" -s "%LARK_APP_SECRET%" --scope "%SCOPES%"
