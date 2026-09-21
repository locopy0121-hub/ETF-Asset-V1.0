const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const collection=fs.readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const card=fs.readFileSync('src/components/HoldingQuoteModule.tsx','utf8');
const modal=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const editor=fs.readFileSync('src/editor/editorModel.ts','utf8');
const wallEditor=fs.readFileSync('src/components/HoldingMarketWallEditor.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const release=fs.readFileSync('.github/workflows/release-v1.yml','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));

assert.match(home,/wallConfig=\{editor\.displayConfig\.holdingWall\?\?DEFAULT_HOLDING_WALL_CONFIG\}/,'home main market wall must consume editor config with safe default');
assert.ok(!/sortHoldingQuotes\(finance\.holdings[\s\S]{0,100}slice\(/.test(home),'home market wall must not cap holdings');
assert.match(collection,/rows\.map\(/,'collection must render all holding rows');
assert.match(collection,/wallConfig=\{wallConfig\}/,'collection must pass main market wall config to every card');
assert.match(card,/HoldingWallConfig/,'holding cards must accept wall editor config');
assert.match(card,/groups\.header/,'card A header runtime missing');
assert.match(card,/groups\.quote/,'card quote field runtime missing');
assert.match(card,/groups\.footer/,'card footer field runtime missing');

assert.match(wallEditor,/主體行情牆＝首頁大型持股卡片區/,'editor must identify the corrected main market wall');
assert.match(wallEditor,/A 標題列（母）/,'main wall A editor missing');
assert.match(wallEditor,/B 欄位（子）/,'main wall B editor missing');
assert.match(wallEditor,/複製 Mini 設定至主體行情牆/,'Mini-to-main copy action missing');
assert.match(wallEditor,/miniSource\.miniColumns/,'copy must use actual Mini column configuration');
assert.match(wallEditor,/miniSource\.miniStyle/,'copy must use actual Mini style configuration');

assert.match(modal,/frame\.key==='holding-quotes'/,'main wall editor must bind only to home holding-quotes frame');
assert.match(modal,/displayDraft\.holdingWall/,'main wall settings must stay in modal draft until apply');
assert.match(modal,/updateDisplayConfig\(displayDraft\)/,'main wall draft must persist only on apply');
assert.match(editor,/holdingWall\?: HoldingWallConfig/,'page display contract missing main wall config');
assert.match(editor,/normalizeHoldingWall/,'persisted main wall config must be normalized');
assert.match(editor,/home: \{ quoteStyle:'quote', sortKey:'pnl', holdingLayoutMode:'list', holdingWall:DEFAULT_HOLDING_WALL_CONFIG \}/,'home default wall config missing');

console.log('V1.0.9 MAIN MARKET WALL EDITOR: PASS');
