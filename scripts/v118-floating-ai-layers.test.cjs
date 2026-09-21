const fs=require('fs');const assert=require('assert');
const app=fs.readFileSync('App.tsx','utf8');
const modal=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const floating=fs.readFileSync('src/components/GlobalFloatingAi.tsx','utf8');
const assistant=fs.readFileSync('src/ai/aiAssistant.ts','utf8');
const aiScreen=fs.readFileSync('src/screens/AiScreen.tsx','utf8');

assert.match(modal,/moveChartLayer/);
for(const label of ['最下層','↓ 下置','↑ 上置','最上層'])assert.ok(modal.includes(label),'chart layer control missing '+label);
assert.match(modal,/layerById/);
assert.match(modal,/zIndex:layerById\.get\(chart\.id\)/);

assert.match(app,/GlobalFloatingAi/);
assert.match(floating,/position:'absolute'/);
assert.match(floating,/PanResponder\.create/);
assert.match(floating,/AsyncStorage\.setItem/);
assert.match(floating,/type Mode='open'\|'minimized'\|'closed'/);
assert.match(floating,/changeMode\('minimized'\)/);
assert.match(floating,/changeMode\('closed'\)/);
assert.match(floating,/answerAiQuestion/);
for(const token of ['你可以做什麼','更新持股股息日','目前持股市值','最近持股有什麼新聞'])assert.ok(floating.includes(token),'floating AI suggestion missing '+token);

for(const keyword of ['新聞','股息','損益','報酬','市值','資產','持股'])assert.ok(assistant.includes(keyword),'AI answer route missing '+keyword);
assert.match(aiScreen,/answerAiQuestion/);
console.log('V1.0.18 floating chart layers/global AI regression: PASS');
