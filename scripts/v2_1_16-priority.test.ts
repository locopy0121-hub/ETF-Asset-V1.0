import assert from 'node:assert/strict';
import {DEFAULT_ETF_BADGES,normalizeEtfBadges,todayEtfReminderMap,badgeDisplayText} from '../src/domain/etfBadges';
import {DEFAULT_PORTFOLIO_LIST,normalizePortfolioList,portfolioColumnValue} from '../src/domain/portfolioList';
import type {DividendLedgerEntry} from '../src/finance/canonicalLedger';
import type {HoldingQuote} from '../src/domain/uiModels';

// Real behavior tests for settings normalization and calendar-driven reminders.
// Layout on an Android device and authoritative issuer data remain independent acceptance gates.
const b=normalizeEtfBadges({
  order:['reminder','etfType','reminder'],
  badges:{
    reminder:{enabled:false,customText:'提醒',fontScale:9,textColor:'invalid',effect:{kind:'pulse',trigger:'alert',speed:'slow',intensity:'soft'}},
    etfType:{enabled:true,fontScale:1.2,textColor:'#123456'},
    dividendType:{enabled:false},
  },
  reminderEvents:['exDate','exDate','unexpected'],
});
assert.deepEqual(b.order,['reminder','etfType','dividendType'],'Each category appears once in saved display order');
assert.deepEqual(b.reminderEvents,['exDate','exDate'],'Unknown reminder events must not be enabled');
assert.equal(b.badges.reminder.fontScale,1.5,'Font controls are clamped');
assert.equal(b.badges.reminder.textColor,DEFAULT_ETF_BADGES.badges.reminder.textColor,'Invalid colors revert to palette defaults');
assert.equal(b.badges.dividendType.enabled,false,'Field switches persist');
assert.equal(b.badges.etfType.textColor,'#123456');
assert.equal(badgeDisplayText('etfType',null,null),'待確認','Do not invent official classification');
assert.equal(badgeDisplayText('dividendType',null,null),'待確認','Do not infer payout frequency');
assert.equal(badgeDisplayText('reminder',null,null),'','Do not display an alert without a dated event');

const entries=[
  {kind:'dividend',id:'d1',symbol:'0050',name:'測試 ETF',note:'最後購買日 2026-09-23；除息日 2026-09-23；配發日 2026-10-01',date:'2026-10-01'},
  {kind:'dividend',id:'d2',symbol:'00878',name:'測試 ETF 2',note:'除息日 2026-09-23',date:'2026-10-10'},
] as unknown as DividendLedgerEntry[];
const all=todayEtfReminderMap(entries,'2026-09-23');
assert.equal(all.get('0050'),'lastBuyDate','Explicit same-day last-buy date has priority');
assert.equal(all.get('00878'),'exDate');
const exOnly=todayEtfReminderMap(entries,'2026-09-23',['exDate']);
assert.equal(exOnly.get('0050'),'exDate','Disabling last-buy reminders still allows ex-date notification');
assert.equal(exOnly.get('00878'),'exDate');
assert.equal(todayEtfReminderMap(entries,'2026-09-24').size,0,'No premature or stale reminders');

const list=normalizePortfolioList({
  fixedWidth:999,rowHeight:5,showName:false,
  columns:[
    {...DEFAULT_PORTFOLIO_LIST.columns[1],label:'價格',width:120,enabled:false},
    {...DEFAULT_PORTFOLIO_LIST.columns[0],label:'股數',width:98,enabled:true},
  ],
});
assert.equal(list.fixedWidth,270,'Fixed symbol column cannot crowd out all numeric columns');
assert.equal(list.rowHeight,52,'Row height is bounded');
assert.equal(list.showName,false);
assert.deepEqual(list.columns.slice(0,2).map(x=>x.key),['price','shares'],'User order persists across normalization');
assert.equal(list.columns[0]?.enabled,false,'Visibility persists');
assert.equal(list.columns[0]?.width,120,'Numeric column width persists');
assert.equal(list.columns.length,DEFAULT_PORTFOLIO_LIST.columns.length,'No financial column is lost when normalizing settings');

const row={
  etfType:'市值型',dividendType:'半年配',symbol:'0050',name:'測試',shares:170,price:100,previousClose:98,
  avgCost:90,tradeAvg:89,costAvg:90,marketValue:17000,pnl:500,pricePnl:600,roi:3.12,weight:20,
  cumulativeDividend:130,realizedPnl:80,comprehensivePnl:630,pinned:false,sparkline:[98,100],
} satisfies HoldingQuote;
assert.equal(portfolioColumnValue(row,'shares').value,'170');
assert.equal(portfolioColumnValue(row,'tradeAvg').value,'89.00');
assert.equal(portfolioColumnValue(row,'costAvg').value,'90.00');
assert.equal(portfolioColumnValue(row,'marketValue').numeric,17000);
assert.equal(portfolioColumnValue(row,'pnl').numeric,500);
assert.equal(portfolioColumnValue(row,'cumulativeDividend').numeric,130);
assert.equal(portfolioColumnValue(row,'comprehensivePnl').numeric,630);
console.log('V2.1.16 priority behavior PASS: independent badges, reminders, sortable editable columns, display-only finance');
