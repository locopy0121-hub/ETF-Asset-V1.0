import assert from 'node:assert/strict';
import fs from 'node:fs';

const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
const screen=fs.readFileSync('src/screens/AiScreen.tsx','utf8');

for(const token of ['GeminiDiagnostic','requestKeys','payloadBytes','responseContentType','responseBodyPreview'])
  assert.ok(gemini.includes(token),'missing Gemini diagnostic field '+token);
assert.match(gemini,/response\.headers\.get\('content-type'\)/);
assert.match(gemini,/raw\.replace\(\/\\s\+\/g/);
assert.match(gemini,/請查看 AI 頁面的 Gemini 連線／格式診斷/);

for(const token of ['Gemini 連線／格式診斷','Request keys','Payload','Response Content-Type','responseBodyPreview'])
  assert.ok(screen.includes(token),'AI page missing diagnostic UI '+token);
assert.match(screen,/setGeminiDiagnostic/);
assert.match(screen,/selectable/);
assert.doesNotMatch(screen,/snapshot\.holdings|entries\.map/,
  'diagnostic panel must not render private snapshot contents');

console.log('V3.2.27 Gemini request/response diagnostics PASS');
