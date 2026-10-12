const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
assert.ok(fs.existsSync('src/market/EtfBasicProfileService.ts'),'on-demand profile service must exist');
const disk=new Map();let calls=0,fail=false;
global.fetch=async url=>{calls++;if(fail)throw new Error('offline');return url.includes('t187ap47_L')?
 new Response(JSON.stringify([{'基金代號':'00406A','基金英文名稱':'Official Test ETF','成立日期':'1150602','基金經理人':'測試經理'}])):
 new Response('<title>00406A.TW</title><table><tr><th>交易所代碼</th><td>00406A</td><th>英文名稱</th><td>Secondary</td><th>ETF規模</th><td>123(百萬台幣)(2026/10/12)</td><th>發行公司</th><td>測試投信</td><th>ETF市價</th><td>10.1800（10/12）</td></tr></table>');};
function service(){const file='src/market/EtfBasicProfileService.ts',m={exports:{}};
 const req=id=>id==='@react-native-async-storage/async-storage'?{getItem:async k=>disk.get(k)??null,setItem:async(k,v)=>{disk.set(k,v);}}:id.startsWith('.')?require(path.resolve(path.dirname(file),id)+'.ts'):require(id);
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(req,m,m.exports);return m.exports;}
(async()=>{
 const first=service();const result=await first.loadEtfBasicProfile('00406A');
 assert.equal(result.profile.fields.english.value,'Official Test ETF');assert.equal(result.profile.fields.issuer.value,'測試投信');assert.equal(calls,2);
 await first.loadEtfBasicProfile('00406A');assert.equal(calls,2,'cached view must not repeatedly request reference data');
 const restarted=service();await restarted.loadEtfBasicProfile('00406A');assert.equal(calls,2,'persistent reference data must survive remount/restart');
 fail=true;const failed=await restarted.loadEtfBasicProfile('00406A',true);assert.equal(failed.profile.fields.issuer.value,'測試投信');assert.ok(failed.warning);
 assert.equal((await restarted.loadEtfBasicProfile('0050',true)).profile,null,'another ETF must not inherit prior profile');
 console.log('On-demand ETF profile actual service / per-symbol cache / restart / source failure retention PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
