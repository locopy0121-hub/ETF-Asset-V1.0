// Smoke coverage only. Does not replace runtime / UI / device validation.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const runtime=read('src/settings/SettingsRuntime.tsx');
const shell=read('src/components/PageShell.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const app=read('App.tsx');
const floating=read('src/components/GlobalFloatingAi.tsx');
const behavior=read('src/settings/settingsControlBehavior.ts');
const dividend=read('src/screens/DividendScreen.tsx');
assert.match(runtime,/pageTitles:Partial<Record<MainPageKey,string>>/);
assert.match(runtime,/patchPageTitle:\(page:MainPageKey,title:string\)=>void/);
assert.match(runtime,/patchAi:\(patch:Partial<AiPrefs>\)=>void/);
assert.match(runtime,/const controls=normalizeControlPrefs\(input\)/);
assert.match(shell,/resolvePageTitle\(pageKey,title,settings\.prefs\.pageTitles\)/);
assert.match(modal,/accessibilityLabel="頁面標題"/);
assert.match(modal,/patchPageTitle\(pageKey,titleDraft/);
assert.match(settings,/title="AI 助理控制"/);
assert.match(settings,/label="顯示 AI 浮動按鈕／視窗"/);
assert.match(settings,/label="各頁標題設定"/);
assert.match(settings,/setAppPanel\(toggleExclusivePanel\(appPanel,/);
assert.match(app,/const aiUi=deriveAiUiState\(settings\.prefs\.ai,active\)/);
assert.match(app,/MAIN_PAGES\.filter\(page=>page\.key!=='ai'\|\|aiUi\.showAiTab\)/);
assert.match(floating,/deriveAiUiState\(aiSettings\.prefs\.ai,'home'\)\.showFloatingAi/);
assert.match(dividend,/aiSettings\.prefs\.ai\.enabled\?/);
for(const token of ['normalizeControlPrefs','patchPageTitle','patchAiPrefs','resolvePageTitle','deriveAiUiState','toggleExclusivePanel'])assert(behavior.includes(token),'Control behavior missing '+token);
const screens={home:'HomeScreen',ledger:'LedgerScreen',portfolio:'PortfolioScreen',dividend:'DividendScreen',ai:'AiScreen'};
for(const [key,screen] of Object.entries(screens)){
  const source=read('src/screens/'+screen+'.tsx');
  assert.match(source,new RegExp('pageKey="'+key+'"'),screen+' is missing saved title binding');
}
console.log('V1.1.3 controls source smoke: PASS; runtime/UI/device validation remains required');
