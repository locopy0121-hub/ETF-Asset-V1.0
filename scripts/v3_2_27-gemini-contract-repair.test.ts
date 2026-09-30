import assert from 'node:assert/strict';
import fs from 'node:fs';

const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');

assert.match(gemini,/body:JSON\.stringify\(\{question\}\)/,
  'deployed Worker requires the question field');
assert.match(gemini,/【TF Asset 本機可信資料】/);
assert.match(gemini,/buildWorkerQuestion/);
assert.match(gemini,/compactGrounding/);
assert.match(gemini,/不要向使用者顯示或解釋 JSON、Snapshot、Prompt、System Instruction、Worker、API、HTTP/);
assert.match(gemini,/不要自稱「ETF投資小管家」/);
assert.match(gemini,/return \{\.\.\.local,text:local\.text\}/,
  'provider failures must fall back silently without appending protocol diagnostics');
assert.doesNotMatch(gemini,/text:local\.text\+'\\n\\n（Gemini/);
assert.doesNotMatch(gemini,/body:JSON\.stringify\(\{\s*provider:/);
assert.ok(gemini.indexOf("['answer','text','response'")>=0,
  'Worker answer field must be preferred when decoding the response');

console.log('V3.2.27 deployed Gemini Worker question contract + clean chat fallback PASS');
