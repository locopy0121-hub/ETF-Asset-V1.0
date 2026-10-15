import {queryLocalEtfComponents,queryLocalEtfMeta} from '../native/TfAssetNativeBridge';

export const GEMINI_LOCAL_TOOLS=[{
  functionDeclarations:[
    {
      name:'queryLocalEtfComponents',
      description:'從 TF Asset 手機本機 SQLite 查詢 ETF 成分股。不得改用網路或模型記憶補資料。',
      parameters:{
        type:'OBJECT',
        properties:{
          symbol:{type:'STRING',description:'ETF 代號，例如 00878、00919、00406A'},
          topN:{type:'INTEGER',description:'回傳前 N 大成分，1 到 100'},
        },
        required:['symbol'],
      },
    },
    {
      name:'queryLocalEtfMeta',
      description:'從 TF Asset 手機本機 SQLite 查詢 ETF 屬性、配息頻率、費用率、分類與資料日期。',
      parameters:{
        type:'OBJECT',
        properties:{symbol:{type:'STRING'}},
        required:['symbol'],
      },
    },
  ],
}] as const;

export type LocalAiToolCall=Readonly<{name:string;args:Record<string,unknown>}>;

export async function executeLocalAiTool(call:LocalAiToolCall):Promise<unknown>{
  if(call.name==='queryLocalEtfComponents'){
    const symbol=String(call.args.symbol??'').trim().toUpperCase();
    const topN=Math.max(1,Math.min(100,Math.floor(Number(call.args.topN)||20)));
    return queryLocalEtfComponents(symbol,topN);
  }
  if(call.name==='queryLocalEtfMeta'){
    return queryLocalEtfMeta(String(call.args.symbol??'').trim().toUpperCase());
  }
  throw new Error('不允許的 AI Tool：'+call.name);
}
