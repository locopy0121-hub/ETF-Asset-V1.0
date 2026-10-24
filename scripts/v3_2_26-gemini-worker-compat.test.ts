import assert from 'node:assert/strict';
import fs from 'node:fs';

const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
const tools=fs.readFileSync('src/ai/aiTools.ts','utf8');
const context=fs.readFileSync('src/ai/buildAnalysisContext.ts','utf8');

assert.match(gemini,/buildAnalysisContext/);
assert.doesNotMatch(gemini,/tools:GEMINI_LOCAL_TOOLS/);
assert.doesNotMatch(gemini,/body:JSON\.stringify\(\{\s*question\s*,\s*toolResults/,'Tool results may be embedded inside the question grounding, but must not change the deployed Worker root contract');

// Local Tool contracts remain implemented for App-side research and a future Worker upgrade.
assert.match(tools,/queryLocalEtfComponents/);
assert.match(tools,/queryLocalEtfMeta/);
assert.match(tools,/executeLocalAiTool/);
assert.match(context,/queryLocalEtfComponents/);
assert.match(context,/queryLocalEtfMeta/);
assert.match(context,/isCurrentlyHeld/);

console.log('V3.2.26 local SQLite grounding architecture remains available PASS');
