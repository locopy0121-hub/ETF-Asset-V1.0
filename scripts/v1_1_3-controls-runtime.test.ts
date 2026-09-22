import assert from 'node:assert/strict';

import {
  deriveAiUiState,
  normalizeControlPrefs,
  patchAiPrefs,
  patchPageTitle,
  resolvePageTitle,
  toggleExclusivePanel,
  type ControlPrefs,
} from '../src/settings/settingsControlBehavior';

const defaults:ControlPrefs={
  pageTitles:{},
  ai:{enabled:true,floatingButton:true},
};

const edited=patchPageTitle(defaults,'home','  我的資產首頁  ');
assert.equal(edited.pageTitles.home,'我的資產首頁');
assert.equal(resolvePageTitle('home','首頁',edited.pageTitles),'我的資產首頁');
assert.equal(resolvePageTitle('portfolio','庫存',edited.pageTitles),'庫存');

const longTitle='標'.repeat(60);
assert.equal(patchPageTitle(edited,'portfolio',longTitle).pageTitles.portfolio?.length,48);
assert.equal(resolvePageTitle('home','首頁',patchPageTitle(edited,'home','   ').pageTitles),'首頁');

const disabled=patchAiPrefs(edited,{enabled:false});
assert.deepEqual(deriveAiUiState(disabled.ai,'ai'),{
  showAiTab:false,
  showFloatingAi:false,
  nextActivePage:'home',
});
const floatingOff=patchAiPrefs(edited,{floatingButton:false});
assert.deepEqual(deriveAiUiState(floatingOff.ai,'portfolio'),{
  showAiTab:true,
  showFloatingAi:false,
  nextActivePage:'portfolio',
});

const restored=normalizeControlPrefs(JSON.parse(JSON.stringify({
  pageTitles:{home:'  保存後首頁  ',settings:'控制中心'},
  ai:{enabled:false,floatingButton:false},
})));
assert.deepEqual(restored,{
  pageTitles:{home:'保存後首頁',settings:'控制中心'},
  ai:{enabled:false,floatingButton:false},
});

assert.equal(toggleExclusivePanel(null,'titles'),'titles');
assert.equal(toggleExclusivePanel('titles','titles'),null);
assert.equal(toggleExclusivePanel('titles','reset'),'reset');

console.log('V1.1.3 controls runtime behavior: PASS');
