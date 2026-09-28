import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const includes=(body:string,value:string,label:string)=>assert.ok(body.includes(value),label);

const detail=read('src/screens/HoldingDetailScreen.tsx');
includes(detail,'headerFrameKey="holding-detail-header"','detail header must use an isolated editable frame');
includes(detail,'includeBottomInset','holding detail must reserve Android bottom safe area');
includes(detail,'<PageGearButton onPress={()=>setSettingsOpen(true)}/>','holding detail must expose page settings');
includes(detail,'<PageEditorStack pageKey="portfolio"','holding detail frames must enter the maintenance engineer');
for(const key of ['holding-detail-quote','holding-detail-info','holding-detail-pnl','holding-detail-dividend','holding-detail-history','holding-detail-calculator']){
  includes(detail,`key:'${key}'`,`missing editable detail frame ${key}`);
}

const registry=read('src/domain/frameRegistry.ts');
for(const key of ['holding-detail-header','holding-detail-quote','holding-detail-info','holding-detail-pnl','holding-detail-dividend','holding-detail-history','holding-detail-calculator']){
  includes(registry,`key:'${key}'`,`frame registry missing ${key}`);
}

const shell=read('src/components/PageShell.tsx');
includes(shell,"edges={includeBottomInset?['top','bottom']:['top']}","PageShell must opt into bottom safe inset");
includes(shell,"engineer.getWorkspace(pageKey,headerFrameKey)","detail header must have its own engineer workspace");

const app=read('App.tsx');
includes(app,"const expectedPage=detail?'portfolio':active;","detail maintenance session must remain active");
includes(app,"maintenance.session.page!==expectedPage||chartHolding","chart page remains isolated from detail maintenance");

const config=JSON.parse(read('app.json'));
assert.equal(config.expo.version,'3.1.18');
assert.equal(config.expo.android.versionCode,30118);
assert.equal(config.expo.androidNavigationBar?.barStyle,'dark-content');
assert.equal(config.expo.androidNavigationBar?.backgroundColor,'#FFFFFF');

console.log('V3.1.18 holding detail editor and Android safe-area regression PASS');
