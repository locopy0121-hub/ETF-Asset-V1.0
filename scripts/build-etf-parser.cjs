const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('src/market/etfConstituents.ts','utf8');
fs.writeFileSync('server/src/etfConstituentParser.mjs',
  '// Generated from src/market/etfConstituents.ts; regenerate with scripts/build-etf-parser.cjs.\n'+
  ts.transpile(source,{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}));
