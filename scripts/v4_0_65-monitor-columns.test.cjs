const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
const react={createContext:()=>({}),useContext:()=>null,useEffect:()=>{},useMemo:fn=>fn(),useState:init=>[typeof init==='function'?init():init,()=>{}]};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};let src=fs.readFileSync(file,'utf8');if(file.endsWith('MonitorSettingsRuntime.tsx'))src+='\nexport {normalize as normalizeForTest};';const output=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const req=id=>{if(id==='react')return react;if(id.includes('async-storage'))return {default:{}};if(id.startsWith('.')){const base=path.resolve(path.dirname(file),id),found=['.ts','.tsx','.js',''].map(x=>base+x).find(fs.existsSync);return load(found);}return require(id);};new Function('require','module','exports',output)(req,m,m.exports);cache.set(file,m.exports);return m.exports;}
const {normalizeForTest}=load('src/monitor/MonitorSettingsRuntime.tsx');
for(const n of [1,2,3,4,5,12,100,2147483647])assert.equal(normalizeForTest({normalWallLayout:{columns:n}}).normalWallLayout.columns,n,'saved column count must survive hydration: '+n);
console.log('V4.0.65 custom column count hydration PASS');
const {parseMonitorColumns,normalizeMonitorColumns,monitorWallGeometry}=load('src/monitor/monitorWallGeometry.ts');
for(const s of ['','0','-1','2.2','NaN','Infinity','1e3','2147483648'])assert.equal(parseMonitorColumns(s),null);
assert.equal(parseMonitorColumns(' 12 '),12);
for(const v of [undefined,null,NaN,Infinity,-1,0,1.5,'5'])assert.equal(normalizeMonitorColumns(v),2);
const one=monitorWallGeometry(320,12,1,8,1080,7);
for(const n of [2,3,5,12]){const g=monitorWallGeometry(320,12,n,8,1080,20);assert.equal(g.cardWidth,one.cardWidth);assert.equal(g.contentWidth,n*296+(n-1)*8);assert.equal(g.windowWidth,Math.min(1080,24+g.contentWidth));}
assert.deepEqual(monitorWallGeometry(1200,32,2147483647,32,700,9),{cardWidth:1136,windowWidth:700,contentWidth:10480});
console.log('V4.0.65 input validation and fixed-size presentation geometry PASS');
