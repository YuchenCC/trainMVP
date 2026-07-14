import { spawn } from 'node:child_process';

const appId = process.env.LARK_APP_ID;
const appSecret = process.env.LARK_APP_SECRET;
const oauthScopes = process.env.LARK_MCP_OAUTH_SCOPES ?? [
  'offline_access',
  'docs:doc:readonly',
  'docs:document.content:read',
  'docx:document:readonly',
  'wiki:wiki:readonly',
  'wiki:node:read',
  'wiki:node:retrieve',
  'wiki:space:read',
  'wiki:space:retrieve',
  'docs:document:import',
  'docs:permission.member:create',
  'docs:permission.member:retrieve',
  'contact:user:search',
  'contact:user.id:readonly',
  'contact:user.basic_profile:readonly',
  'task:task:write',
  'task:task:read',
].join(',');

if (!appId) {
  console.error('LARK_APP_ID is not set. Please set it before starting Codex.');
  process.exit(2);
}

if (!appSecret) {
  console.error('LARK_APP_SECRET is not set. Please set it before starting Codex.');
  process.exit(2);
}

const cli = 'C:/Users/Administrator/.codex/packages/lark-mcp/node_modules/@larksuiteoapi/lark-mcp/dist/cli.js';
const child = spawn(
  process.execPath,
  [
    cli,
    'mcp',
    '-a',
    appId,
    '-s',
    appSecret,
    '--oauth',
    '--scope',
    oauthScopes,
    '--token-mode',
    'user_access_token',
    '--tool-name-case',
    'snake',
    '--language',
    'zh',
  ],
  { stdio: 'inherit', windowsHide: true },
);

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.once('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
