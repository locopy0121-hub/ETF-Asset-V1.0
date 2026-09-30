import assert from 'node:assert/strict';
import fs from 'node:fs';

const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
const tools=fs.readFileSync('src/ai/aiTools.ts','utf8');
const context=fs.readFileSync('src/ai/buildAnalysisContext.ts','utf8');

assert.match(gemini,/mode:'app_local_preflight'/);
assert.match(gemini,/aiAnalysis:/);
assert.match(gemini,/snapshot:groundedSnapshot/);
assert.match(gemini,/buildAnalysisContext/);
assert.match(gemini,/TF_ASSET_GEMINI_SYSTEM_INSTRUCTION/);

// The deployed Worker uses a strict established request envelope. Root-level Gemini SDK
// fields caused HTTP 400 in V3.2.25, so tools/context must not be added beside snapshot.
assert.doesNotMatch(gemini,/tools:GEMINI_LOCAL_TOOLS/);
assert.doesNotMatch(gemini,/analysisContext,\s*tools:/);
assert.doesNotMatch(gemini,/toolResults,/);

// Local Tool contracts remain implemented for future Worker capability upgrades and App-side use.
assert.match(tools,/queryLocalEtfComponents/);
assert.match(tools,/queryLocalEtfMeta/);
assert.match(tools,/executeLocalAiTool/);
assert.match(context,/queryLocalEtfComponents/);
assert.match(context,/queryLocalEtfMeta/);
assert.match(context,/isCurrentlyHeld/);

console.log('V3.2.26 Gemini Worker compatibility + local SQLite grounding PASS');
