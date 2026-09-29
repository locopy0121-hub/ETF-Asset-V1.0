import assert from 'node:assert/strict';
import fs from 'node:fs';
import {marketIntradaySeriesFor,marketQuoteSnapshotFor,marketValuationQuoteFor} from '../src/market/marketCenterViews';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const frame=read('src/components/FrameCard.tsx');
const finance=read('src/finance/FinanceRuntime.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');
const targetEffects=read('src/maintenance/TargetSurfaceEffects.tsx');

const must=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};

// Problem 1: upper half renders at actual page width and scales as one surface.
must(workbench.includes('actualPageWidth=Math.max(280,Math.round(windowWidth-spacing.lg*2))'),'actual page width is not resolved independently');
must(workbench.includes("transformOrigin:'top left'"),'real page is not uniformly scaled from top-left');
must(workbench.includes('transform:[{scale:previewScale}]'),'preview does not uniformly scale the real page');
must(workbench.includes('scaledPageHeight'),'scaled viewport height missing');
must(frame.includes('onMeasuredSize'),'actual rendered frame measurement missing');

// Problem 2: original ordering survives unified editor.
must(workbench.includes('onMoveFrame'),'frame ordering callback missing');
must(workbench.includes('目前順位'),'frame order UI missing');
must(workbench.includes('功能設定排序'),'module content ordering UI missing');
for(const token of ['value.overview.order','value.profitAnalysis.order','value.profitDetail.order','value.quickActions.order'])
  must(workbench.includes(token),'missing dashboard order editor '+token);

// Problem 3: quote, intraday chart and valuation are independent market-center views.
const base:any={
  symbol:'0050',name:'0050',currentPrice:200,previousClose:198,sourceQuoteAt:Date.now()-60_000,
  quality:'previous_close',source:'TWSE_DAILY',priceType:'PREV_CLOSE',isFallback:true,market:'TSE',
  statusMessage:'close',checkedAt:Date.now(),liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,
  sparkline:[198,200],intraday:[],intradayDate:null,intradayPreviousClose:null,
};
must(marketQuoteSnapshotFor([base],'0050')?.currentPrice===200,'quote wall view lost valid snapshot');
must(marketIntradaySeriesFor([base],'0050').points.length===0,'intraday should remain independently empty');
must(marketValuationQuoteFor([base],'0050')?.currentPrice===200,'previous close must remain valid for valuation outside market hours');
must(Boolean(marketValuationQuoteFor([{...base,quality:'backup_realtime'}],'0050')),'verified backup realtime must remain usable for valuation');
must(!marketValuationQuoteFor([{...base,quality:'bid_ask'}],'0050'),'bid/ask indication must not silently become portfolio valuation');
must(finance.includes('marketValuationQuoteFor'),'FinanceRuntime is not reading the valuation view');
must(home.includes('marketQuoteSnapshotFor')&&home.includes('marketIntradaySeriesFor'),'Home quote wall and chart do not read separate market views');
must(portfolio.includes('marketQuoteSnapshotFor')&&portfolio.includes('marketIntradaySeriesFor'),'Portfolio quote wall and chart do not read separate market views');

// Added background image capability reuses existing renderer; content opacity stays separate.
must(workbench.includes("['image','圖片']"),'image background mode missing in settings editor');
must(workbench.includes('THEME_BACKGROUNDS.map'),'built-in background image chooser missing');
must(workbench.includes('圖片透明度'),'image opacity control missing');
must(frame.includes("fx.backgroundMode==='image'"),'frame image renderer missing');
must(targetEffects.includes("appearance.backgroundMode==='image'"),'card image renderer missing');

// Existing rule: no user-facing follow sentinel.
must(!workbench.includes('（跟隨）'),'follow sentinel leaked into editor');
must(!workbench.includes('min={-1}'),'negative layout sentinel leaked into editor');

console.log('V3.2.13 proportional preview + ordering + market-view isolation + image background PASS');
