const fs=require('node:fs');const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const ai=read('src/ai/aiAssistant.ts');
assert.match(ai,/const annotatedEntryDate=/);
assert.match(ai,/未來日期，請確認是否為預約交易/);
assert.match(ai,/rows\.join\('\\n\\n'\)/);
assert.match(ai,/now\.getFullYear\(\)/);
assert.equal(JSON.parse(read('app.json')).expo.android.versionCode,20110);
console.log('V2.1.10 AI future-date warning and legible holdings source smoke: PASS');
