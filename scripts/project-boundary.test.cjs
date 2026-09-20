const fs=require('node:fs');
const path=require('node:path');

const ROOT=process.cwd();
const roots=['src','scripts','docs'].filter(p=>fs.existsSync(path.join(ROOT,p)));
const blocked=[
  /ETF-Finance-Manager-V5(?:\.0)?/i,
  /\bBlueprint\s*B\b/i,
  /360\s*編輯器/i,
  /\bisGlobalEditing\b/,
  /(?:^|[\\/])src[\\/]v3(?:[\\/]|$)/i,
  /\bpageCustomize\b/,
];
const allowFiles=new Set(['scripts/project-boundary.test.cjs']);

function walk(dir,out=[]){
  for(const name of fs.readdirSync(dir)){
    const full=path.join(dir,name);
    const stat=fs.statSync(full);
    if(stat.isDirectory()) walk(full,out);
    else if(/\.(?:ts|tsx|js|jsx|cjs|mjs|json|md|yml|yaml)$/.test(name)) out.push(full);
  }
  return out;
}
const violations=[];
for(const root of roots){
  for(const file of walk(path.join(ROOT,root))){
    const rel=path.relative(ROOT,file).replace(/\\/g,'/');
    if(allowFiles.has(rel)) continue;
    const text=fs.readFileSync(file,'utf8');
    for(const rule of blocked){
      if(rule.test(text)) violations.push(rel+' -> '+rule);
    }
  }
}
if(violations.length){
  console.error('TF_ASSET_PROJECT_BOUNDARY: FAIL');
  for(const v of violations) console.error(v);
  process.exit(1);
}
console.log('TF_ASSET_PROJECT_BOUNDARY: PASS');
console.log('Allowed cross-project source: ETF-Finance-Manager-V3.7 / V3.7.8 Canonical Finance Core + Monitor only.');
