import assert from 'node:assert/strict';
import fs from 'node:fs';

import { PAGE_FRAMES } from '../src/domain/frameRegistry';
import { createInitialEditorState, normalizeEditorConfig } from '../src/editor/pageEditor';

const requiredFiles = [
  'src/editor/pageEditor.tsx',
  'src/components/PageEditorStack.tsx',
  'src/components/PageFrameSettingsModal.tsx',
  'src/components/FrameCard.tsx',
];
for (const file of requiredFiles) assert.ok(fs.existsSync(file), `missing editor architecture file: ${file}`);

const initial = createInitialEditorState();
for (const page of ['home','ledger','portfolio','dividend','settings'] as const) {
  assert.equal(
    Object.keys(initial[page]).length,
    PAGE_FRAMES[page].length,
    `editor config count mismatch for ${page}`,
  );
  PAGE_FRAMES[page].forEach((frame, index) => {
    const config = initial[page][frame.key];
    assert.ok(config, `missing config for ${page}/${frame.key}`);
    assert.equal(config.visible, true);
    assert.equal(config.order, index);
    assert.equal(config.layout, 'standard');
    assert.equal(config.appearance, 'theme');
    assert.equal(config.behavior, 'manual');
  });
}

const homeDraft = { ...initial.home };
const first = PAGE_FRAMES.home[0]!;
const second = PAGE_FRAMES.home[1]!;
homeDraft[first.key] = { ...homeDraft[first.key]!, order: 2, layout: 'dense', appearance: 'outline' };
homeDraft[second.key] = { ...homeDraft[second.key]!, order: 0, behavior: 'auto' };
const normalized = normalizeEditorConfig('home', homeDraft);
assert.equal(normalized[first.key]?.layout, 'dense');
assert.equal(normalized[first.key]?.appearance, 'outline');
assert.equal(normalized[second.key]?.behavior, 'auto');
assert.deepEqual(
  Object.values(normalized).map(value => value.order).sort((a,b)=>a-b),
  [0,1,2,3],
  'orders must normalize to unique contiguous positions',
);

const modal = fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
for (const label of ['顯示內容','版面','外觀','排序 / 行為','標準','緊湊','密集','跟隨主題','柔和底色','強調外框','手動排序','自動順位','鎖定','套用','取消','重設本頁']) {
  assert.ok(modal.includes(label), `editor modal missing control: ${label}`);
}
assert.match(modal,/normalizeEditorConfig/,'editor must normalize draft before apply');
assert.match(modal,/behavior !== 'manual'/,'manual order controls must respect behavior');
assert.match(modal,/behavior === 'locked'/,'locked frames must block changes');

const frameCard = fs.readFileSync('src/components/FrameCard.tsx','utf8');
assert.match(frameCard,/FrameLayout/);
assert.match(frameCard,/FrameAppearance/);
assert.match(frameCard,/cardCompact/);
assert.match(frameCard,/cardDense/);
assert.match(frameCard,/cardSoft/);
assert.match(frameCard,/cardOutline/);

const stack = fs.readFileSync('src/components/PageEditorStack.tsx','utf8');
assert.match(stack,/filter\(item => config\[item\.key\]\?\.visible !== false\)/,'runtime must consume visibility');
assert.match(stack,/\.sort\(/,'runtime must consume order');
assert.match(stack,/layout:/,'runtime must consume layout');
assert.match(stack,/appearance:/,'runtime must consume appearance');

for (const [file,page] of [
  ['src/screens/HomeScreen.tsx','home'],
  ['src/screens/LedgerScreen.tsx','ledger'],
  ['src/screens/PortfolioScreen.tsx','portfolio'],
  ['src/screens/DividendScreen.tsx','dividend'],
] as const) {
  const source=fs.readFileSync(file,'utf8');
  assert.match(source,/PageEditorStack/,`${page} must consume editor runtime`);
  assert.ok(source.includes(`pageKey="${page}"`), `${page} modal/stack must bind correct page key`);
}

const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.ok(!settings.includes('PageFrameSettingsModal'),'Settings page must remain outside page-frame editor');

const registry=fs.readFileSync('src/domain/frameRegistry.ts','utf8');
assert.match(registry,/key:'holding-view'/,'portfolio must expose actual holding-view frame');
assert.ok(!registry.includes("key:'quote-wall'"),'portfolio registry must not split a non-existent physical frame');

console.log('TF_ASSET_EDITOR_ARCHITECTURE: PASS');
