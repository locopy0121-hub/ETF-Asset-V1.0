import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_DASHBOARD_LAYOUT,normalizeDashboardLayout} from '../src/domain/dashboardLayout';

const migrated=normalizeDashboardLayout({
  sectionGap:12,
  overview:{minHeight:132,padding:16,prefixVisible:true,captionVisible:true,decorationVisible:true},
  profitAnalysis:{cardGap:10,cardHeight:104,iconVisible:true,captionVisible:true},
  profitDetail:{itemCount:4,rowHeight:48,showMore:true},
  quickActions:{columns:4,iconSize:24,titleVisible:true},
});
assert.equal(migrated.overview.valueFontSize,42);
assert.equal(migrated.overview.contentGap,4);
assert.deepEqual(migrated.overview.order,['label','amount','caption']);
assert.equal(migrated.profitAnalysis.cardPadding,12);
assert.deepEqual(migrated.profitAnalysis.order,['realizedNetPnL','totalPnl','totalUnrealizedProfit','totalMarketValue']);
assert.equal(migrated.profitDetail.rowPaddingHorizontal,12);
assert.deepEqual(migrated.quickActions.order,['stock-query','ledger','allocation','dividend']);

const custom=normalizeDashboardLayout({
  ...DEFAULT_DASHBOARD_LAYOUT,
  overview:{...DEFAULT_DASHBOARD_LAYOUT.overview,valueFontSize:55,labelColor:'#abcdef',order:['amount','amount','caption']},
  profitAnalysis:{...DEFAULT_DASHBOARD_LAYOUT.profitAnalysis,cardPadding:23,order:['totalMarketValue','realizedNetPnL']},
  profitDetail:{...DEFAULT_DASHBOARD_LAYOUT.profitDetail,rowGap:21,order:['total','price']},
  quickActions:{...DEFAULT_DASHBOARD_LAYOUT.quickActions,itemPadding:17,order:['dividend','ledger']},
});
assert.equal(custom.overview.valueFontSize,55);
assert.equal(custom.overview.labelColor,'#ABCDEF');
assert.deepEqual(custom.overview.order,['amount','caption','label']);
assert.deepEqual(custom.profitAnalysis.order,['totalMarketValue','realizedNetPnL','totalPnl','totalUnrealizedProfit']);
assert.deepEqual(custom.profitDetail.order,['total','price','net','realized']);
assert.deepEqual(custom.quickActions.order,['dividend','ledger','stock-query','allocation']);

const stack=fs.readFileSync('src/components/PageEditorStack.tsx','utf8');
for(const component of ['DashboardAssetOverview','DashboardProfitAnalysis','DashboardProfitDetail','DashboardQuickActions']){
  assert.match(stack,new RegExp(`child\\.type===${component}`),component+' must bridge the real rendered child into maintenance');
}
const settings=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
for(const frame of ['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions']){
  assert.ok(settings.includes(`'${frame}'`),frame+' must expose a page-setting content editor');
}
for(const tool of ['內容排序','KPI 排序','明細排序','按鈕排序','文字顏色','卡片內距']){
  assert.ok(settings.includes(tool),'missing dashboard content setting: '+tool);
}
const editable=fs.readFileSync('src/components/dashboard/DashboardEditableContent.tsx','utf8');
assert.ok(editable.includes('InspectableTarget'),'dashboard content must use real resident maintenance targets');
assert.ok(editable.includes("kind==='value'"),'value targets must preserve finance data semantics');

console.log('V3.1.17 dashboard content editing gate PASS');
