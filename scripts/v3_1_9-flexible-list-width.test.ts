import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizePortfolioList,PORTFOLIO_FIXED_WIDTH_MAX,PORTFOLIO_FIXED_WIDTH_MIN} from '../src/domain/portfolioList';

assert.equal(PORTFOLIO_FIXED_WIDTH_MIN,72);
assert.equal(PORTFOLIO_FIXED_WIDTH_MAX,240);
for(const width of [72,84,100,128,159,160,192,240])
  assert.equal(normalizePortfolioList({fixedWidth:width}).fixedWidth,width,'width should persist at '+width+'dp');
assert.equal(normalizePortfolioList({fixedWidth:1}).fixedWidth,72);
assert.equal(normalizePortfolioList({fixedWidth:999}).fixedWidth,240);

const editor=readFileSync('src/components/PortfolioListEditor.tsx','utf8');
assert.match(editor,/代號欄寬/);
assert.match(editor,/keyboardType="number-pad"/);
assert.match(editor,/onResponderMove=/);
assert.match(editor,/value-1/);
assert.match(editor,/value\+1/);
assert.match(editor,/PORTFOLIO_FIXED_WIDTH_MIN/);
assert.match(editor,/上方真實清單同步預覽/);

// V4.0.3 may subscribe to display colors; preserve the original table structure byte-for-byte.
const table=Buffer.from(readFileSync('src/components/PortfolioHoldingTable.tsx','utf8')
  .replace(/ editorId="[^"]*"| editorReadOnly=\{(?:true|false)\}/g,'')
  .replace("import {Pressable,Text} from './EditableNative';\n",'')
  .replace("import {Animated,ScrollView,StyleSheet,View} from 'react-native';","import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';")
  .replace("import {useSystemColors} from '../theme/useSystemColors';\n",'')
  .replace('\n  const colors=useSystemColors();',''));
const tableText=table.toString('utf8');
assert.match(tableText,/width:config\.fixedWidth/);
assert.match(tableText,/ScrollView horizontal showsHorizontalScrollIndicator/);
const gitBlobHash=createHash('sha1').update('blob '+table.length+'\0').update(table).digest('hex');
assert.equal(gitBlobHash,'732a18dc3cb2e6cd1203f6f44741a334bfc3d225',
  'free width control must not rewrite the restored V3.0.1 table renderer');

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
console.log('V3.1.18 free fixed-column width: 72-240dp, 1dp step, direct input, drag slider, persisted preview: PASS');
