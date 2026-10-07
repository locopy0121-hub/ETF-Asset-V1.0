import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFAULT_PORTFOLIO_LIST,normalizePortfolioList} from '../src/domain/portfolioList';
import {createInitialDisplayState,mergeDisplayState} from '../src/editor/editorModel';
import {PORTFOLIO_PRIMARY_MODES,nextPortfolioPrimaryMode} from '../src/domain/portfolioModeSwitch';

// V4.0.3 may subscribe to display colors; preserve the original table structure byte-for-byte.
const oldTable=Buffer.from(readFileSync('src/components/PortfolioHoldingTable.tsx','utf8')
  .replace("import {useSystemColors} from '../theme/useSystemColors';\n",'')
  .replace('\n  const colors=useSystemColors();',''));
const gitBlobHash=createHash('sha1')
  .update('blob '+oldTable.length+'\0').update(oldTable).digest('hex');
assert.equal(gitBlobHash,'732a18dc3cb2e6cd1203f6f44741a334bfc3d225',
  'V3.0.1 fixed-left horizontal-list component must remain unchanged');
const table=oldTable.toString('utf8');
assert.match(table,/ScrollView horizontal showsHorizontalScrollIndicator/);
assert.match(table,/styles.fixedColumn/);
assert.match(table,/styles.fixedRow/);
assert.match(table,/styles.rightRow/);
assert.match(table,/onPress=\{onOpen\(row\)\}/);
assert.match(table,/PortfolioNumberCell/);

assert.deepEqual(PORTFOLIO_PRIMARY_MODES,['list','wall','quote','compact']);
assert.equal(nextPortfolioPrimaryMode('compact'),'list');
assert.equal(createInitialDisplayState().portfolio.portfolioListStyle,'table');
assert.equal(mergeDisplayState({portfolio:{portfolioListStyle:'simple'}}).portfolio.portfolioListStyle,'table',
  'V3.1.7 saved simplified default must migrate back to original V3.0.1 table');
assert.deepEqual(normalizePortfolioList(null).columns,DEFAULT_PORTFOLIO_LIST.columns);

const screen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const editor=readFileSync('src/editor/editorModel.ts','utf8');
const settings=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const fallback=readFileSync('src/components/PortfolioSafeList.tsx','utf8');
assert.match(screen,/const simpleList=listFallback/);
assert.match(screen,/listInspectorActive/);
assert.match(screen,/maintenance.registerTarget\('portfolio','holding-view'/);
assert.match(screen,/:<HoldingTable rows=\{sorted\} onOpenHolding=\{onOpenHolding\}/,
  'ordinary browsing must render original table without the formerly crashing A wrapper');
assert.match(screen,/<PortfolioSafeList rows=\{sorted\} onOpenHolding=\{onOpenHolding\}/,
  'independent safe renderer remains only behind caught render failure');
assert.match(screen,/setListFallback\(true\)/);
assert.doesNotMatch(screen,/<PortfolioModeSwitcher/);
assert.match(editor,/portfolioListStyle:'table'/);
assert.match(settings,/<PageLayoutToolWorkbench/,'page settings now enter the unified real-layout workbench');
assert.doesNotMatch(settings,/key:'simple',label:'簡易清單'/);
assert.doesNotMatch(fallback,/PortfolioHoldingTable|HoldingQuoteCollection|InspectableTarget|Animated/);
const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
console.log('V3.1.18 V3.0.1 original table SHA + fixed first column + horizontal scroll + saved migration + error-only fallback: PASS');
