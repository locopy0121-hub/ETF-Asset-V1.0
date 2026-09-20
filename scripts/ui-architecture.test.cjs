const fs=require('fs');
const assert=require('assert');

const files=[
  'src/screens/HomeScreen.tsx',
  'src/screens/LedgerScreen.tsx',
  'src/screens/PortfolioScreen.tsx',
  'src/screens/DividendScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/HoldingDetailScreen.tsx',
  'src/components/HoldingQuoteModule.tsx',
  'src/components/PageFrameSettingsModal.tsx',
  'src/domain/frameRegistry.ts',
];
for(const file of files) assert.ok(fs.existsSync(file),`missing UI architecture file: ${file}`);

const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const frames=fs.readFileSync('src/domain/frameRegistry.ts','utf8');
const app=fs.readFileSync('App.tsx','utf8');

assert.match(home,/HoldingQuoteModule/,'home must use shared holding quote module');
assert.match(portfolio,/HoldingQuoteModule/,'portfolio must use shared holding quote module');
assert.match(portfolio,/清單模式/,'portfolio must support list mode');
assert.match(portfolio,/行情牆模式/,'portfolio must support quote-wall mode');
assert.match(portfolio,/PageFrameSettingsModal/,'portfolio gear must open frame-oriented settings');
assert.match(portfolio,/持股試算/,'portfolio must contain calculator entry');
assert.match(settings,/PAGE_FRAMES\.settings/,'settings must be driven by actual settings frames');
assert.match(settings,/Widget（mobile 桌面）/,'settings must distinguish Widget');
assert.match(settings,/Floating Monitor（浮動即時視窗）/,'settings must distinguish Floating Monitor');

for(const key of ['home','ledger','portfolio','dividend','settings']){
  assert.match(frames,new RegExp(`\\b${key}:\\s*\\[`),`missing frame registry for ${key}`);
}
for(const screen of [home,portfolio,fs.readFileSync('src/screens/LedgerScreen.tsx','utf8'),fs.readFileSync('src/screens/DividendScreen.tsx','utf8')]){
  assert.ok(!screen.includes('etfCalculators'),'screen must not import finance calculator directly');
  assert.ok(!screen.includes('calculatePortfolioSummary'),'screen must not recreate canonical finance calculations');
}
for(const label of ['首頁','紀錄','庫存','股息','設定']) assert.ok(app.includes(label)||fs.readFileSync('src/domain/pageRegistry.ts','utf8').includes(label),`missing main page ${label}`);

console.log('TF_ASSET_UI_ARCHITECTURE: PASS');
