const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const dividend=read('src/screens/DividendScreen.tsx');
const settings=read('src/screens/SettingsScreen.tsx');

const toolbarStart=modal.indexOf('<View style={styles.compactToolbar}>');
const toolbarEnd=modal.indexOf('</View>',toolbarStart);
assert.ok(toolbarStart>=0&&toolbarEnd>toolbarStart,'modal must render a dedicated fixed toolbar');
const toolbar=modal.slice(toolbarStart,toolbarEnd);
assert.equal((toolbar.match(/<Pressable/g)||[]).length,2,'only Cancel and Apply may appear in the top bar');
assert.match(toolbar,/onPress={cancel}/);
assert.match(toolbar,/onPress={apply}/);
assert.doesNotMatch(toolbar,/頁面設定|排版工具|<Text style={styles.title}>/);
assert.match(modal,/<SafeAreaView style={styles.root} edges={\['top','bottom'\]}>/);
assert.match(modal,/fixedSplitWorkbench:\{flex:1,minHeight:0/);
assert.match(modal,/<View style={styles.fixedSplitWorkbench}>\s*<PageLayoutToolWorkbench/);
assert.doesNotMatch(modal,/return <Modal[\s\S]*?<ScrollView contentContainerStyle={styles.content}>/,
  'the modal must not wrap the real preview in a page-level ScrollView');
assert.match(modal,/onResetPage={reset}/);
assert.match(modal,/replacePageConfig\(normalizeEditorConfig\(pageKey,draft\)\);updateDisplayConfig\(displayDraft\)/,
  'Apply must preserve the existing editor draft data path');

const splitStart=workbench.indexOf('return <View style={styles.splitRoot}>');
const upper=workbench.indexOf('<View style={styles.fixedPreviewPane}>',splitStart);
const divider=workbench.indexOf('<View style={styles.splitDivider}>',splitStart);
const lower=workbench.indexOf('<ScrollView style={styles.fixedEditorScroll}',splitStart);
assert.ok(splitStart>0&&upper>splitStart&&divider>upper&&lower>divider,
  'visual preview must remain above the independently scrollable editor tools');
assert.match(workbench,/fixedPreviewPane:\{flex:0\.92,minHeight:0/);
assert.match(workbench,/fixedEditorScroll:\{flex:1\.08,minHeight:0/);
assert.match(workbench,/livePageScroll:\{flex:1,minHeight:0/);
assert.doesNotMatch(workbench,/livePageScroll:\{height:380/,
  'the preview must fill its bounded pane rather than depend on a hardcoded height');
assert.ok(upper<workbench.indexOf('<View style={styles.previewShell}>')&&
  workbench.indexOf('<View style={styles.previewShell}>')<divider);
assert.ok(lower<workbench.indexOf('全部框架清單',splitStart));
assert.ok(lower<workbench.indexOf('股息內容編輯項目',splitStart));
assert.match(workbench,/previewFrames\.filter\(item=>item\.key===frameKey\)/,
  'dividend preview must focus the frame being edited rather than start at the top of a long page');
assert.match(workbench,/key={pageKey==='dividend'\|\|pageKey==='home'\|\|pageKey==='portfolio'\?frameKey:'all-frames'}/,
  'switching dividend frames must return the preview scroll to the selected frame');
assert.match(workbench,/onPress={onResetPage}/);
assert.match(workbench,/selectDividendPreview\(actual\.props\.children/);
assert.match(dividend,/<PageFrameSettingsModal previewElements={dividendPreviewElements}/);
assert.doesNotMatch(settings,/PageLayoutToolWorkbench|PageEditorStack|EditableNative/,
  'protected system SettingsScreen must remain unchanged');
console.log('V4.0.19 split editor: safe compact actions, fixed independent preview/editor, selected dividend frame and protected settings PASS');
