export type FinanceFormulaItem = Readonly<{
  key: string;
  title: string;
  formula: string;
  note?: string;
}>;

export const FINANCE_FORMULA_CATALOG: readonly FinanceFormulaItem[] = [
  {key:'tradeAmount',title:'成交金額',formula:'Math.floor(股數 × 成交價)'},
  {key:'buyCashOut',title:'買進現金支出',formula:'成交金額 ＋ actualFee',note:'actualFee 入帳後固化'},
  {key:'sellCashIn',title:'賣出現金流入',formula:'成交金額 － actualFee － actualTax',note:'actualFee / actualTax 入帳後固化'},
  {key:'commission',title:'標準手續費',formula:'Math.max(最低手續費, Math.floor(成交金額 × 手續費率 × 折扣率))'},
  {key:'roundLotMin',title:'整股最低手續費',formula:'20 元'},
  {key:'oddLotMin',title:'零股／定期定額最低手續費',formula:'1 元'},
  {key:'etfTax',title:'ETF 賣出證交稅',formula:'Math.floor(成交金額 × 0.1%)'},
  {key:'stockTax',title:'股票賣出證交稅',formula:'Math.floor(成交金額 × 0.3%)'},
  {key:'tradeCost',title:'純成交成本',formula:'仍持有部位對應的純成交金額合計'},
  {key:'cashBasis',title:'含費持有成本',formula:'仍持有部位純成交成本 ＋ 對應實際買進手續費'},
  {key:'tradeAvg',title:'純成交均價',formula:'純成交成本 ÷ 持有股數',note:'不含手續費'},
  {key:'costAvg',title:'含費成本均價',formula:'含費持有成本 ÷ 持有股數'},
  {key:'marketValue',title:'目前市值',formula:'Math.floor(持有股數 × 即時市價)'},
  {key:'estSellFee',title:'預估賣出手續費',formula:'依目前市值、交易模式與券商參數計算',note:'僅供目前清算估算，不覆寫歷史 actualFee'},
  {key:'estSellTax',title:'預估賣出證交稅',formula:'依目前市值 × ETF 證交稅率計算'},
  {key:'netLiquidation',title:'預估清算價值',formula:'目前市值 － 預估賣出手續費 － 預估賣出證交稅'},
  {key:'priceUnrealized',title:'未實現價格損益',formula:'目前市值 － 純成交成本'},
  {key:'cashUnrealized',title:'未實現現金損益',formula:'預估清算價值 － 含費持有成本'},
  {key:'cashRoi',title:'未實現現金報酬率',formula:'未實現現金損益 ÷ 含費持有成本 × 100%'},
  {key:'releaseTradeCost',title:'賣出釋放純成本',formula:'賣出股數 × 賣出前純成交均價',note:'移動平均'},
  {key:'releaseCashBasis',title:'賣出釋放含費成本',formula:'賣出股數 × 賣出前含費成本均價',note:'移動平均'},
  {key:'realizedNet',title:'已實現現金損益',formula:'賣出淨收入 － 賣出釋放含費成本'},
  {key:'grossDividend',title:'股息總額',formula:'Math.floor(符合配息資格股數 × 每股股息)'},
  {key:'nhi',title:'二代健保補充保費',formula:'股息總額達 20,000 元時 Math.floor(股息總額 × 2.11%)'},
  {key:'transferFee',title:'股息匯費',formula:'股息總額 > 0 時 10 元'},
  {key:'netDividend',title:'股息淨收入',formula:'股息總額 － 補充保費 － 匯費'},
  {key:'cumulativeDividend',title:'累積淨股息',formula:'所有已入帳股息淨收入合計'},
  {key:'comprehensivePnl',title:'含息總損益',formula:'未實現現金損益 ＋ 已實現現金損益 ＋ 累積淨股息'},
  {key:'cashBalance',title:'現金餘額',formula:'期初現金 ＋ 所有 Ledger 現金流'},
  {key:'totalMarketValue',title:'持股總市值',formula:'各持股目前市值加總'},
  {key:'totalAssets',title:'總資產',formula:'持股總市值 ＋ 現金餘額'},
  {key:'weight',title:'資產權重',formula:'單一標的目前市值 ÷ 持股總市值 × 100%'},
  {key:'singleYield',title:'單期殖利率',formula:'單期每股股息 ÷ 即時市價 × 100%'},
  {key:'annualYield',title:'年化殖利率',formula:'單期每股股息 × 年配息次數 ÷ 即時市價 × 100%'},
  {key:'immutability',title:'歷史費稅鎖定規則',formula:'actualFee / actualTax 於 Ledger 寫入時固化',note:'不得因後續券商設定改變而重算'},
  {key:'singleSource',title:'單一金融核心規則',formula:'所有頁面、Widget、Monitor 只讀 Canonical Finance Core Snapshot',note:'禁止各 consumer 自行重算帳務公式'},
] as const;
