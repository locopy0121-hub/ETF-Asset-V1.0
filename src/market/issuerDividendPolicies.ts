/**
 * Versioned, source-attributed issuer payout policies reviewed on 2026-09-24.
 * Presentation/reference data only: no dividend ledger entries, amounts, tax or estimates.
 * An issuer's evaluation calendar does not guarantee a distribution each period.
 */
export type VerifiedIssuerDividendPolicy=Readonly<{
  symbol:string; name:string; etfType:string;
  dividendType:'月配'|'季配'|'半年配'|'年配'|'不配息';
  issuer:string; sourceUrl:string; checkedOn:string; verifiedAt:number;
}>;
const checkedOn='2026-09-24';
const verifiedAt=Date.parse('2026-09-24T00:00:00+08:00');
const policy=(symbol:string,name:string,etfType:string,dividendType:VerifiedIssuerDividendPolicy['dividendType'],issuer:string,sourceUrl:string):VerifiedIssuerDividendPolicy=>
  ({symbol,name,etfType,dividendType,issuer,sourceUrl,checkedOn,verifiedAt});

/** This audited set is deliberately finite; unverified tickers MUST remain unknown. */
export const VERIFIED_ISSUER_DIVIDEND_POLICIES:readonly VerifiedIssuerDividendPolicy[]=[
  policy('0050','元大台灣50','市值型','半年配','元大投信','https://www.yuantafunds.com/myfund/information/1066?tab=4'),
  policy('0056','元大高股息','高股息型','季配','元大投信','https://api.yuantafunds.com/ECImage/AIBackstage/file/2023-06-08/34615d90160743b38d8c1c15fb43068e.pdf'),
  policy('006208','富邦台50','市值型','半年配','富邦投信','https://www.fubon.com/asset-management/fund/dividends/by_yield?Fd=0&contact=1&toDate=2026'),
  policy('00713','元大台灣高息低波','高股息型','季配','元大投信','https://api.yuantafunds.com/ECImage/AIBackstage/file/2023-06-08/34615d90160743b38d8c1c15fb43068e.pdf'),
  policy('00878','國泰永續高股息','高股息型','季配','國泰投信','https://www.cathaysite.com.tw/proj/SPOCathayETF/00878/'),
  policy('00919','群益台灣精選高息','高股息型','季配','群益投信','https://www.capitalfund.com.tw/etf/product/detail/195/interest'),
  policy('00929','復華台灣科技優息','高股息型','月配','復華投信','https://www.fhtrust.com.tw/ETF/etf_calendar'),
  policy('00406A','主動中信台灣收益','主動式','月配','中國信託投信','https://www.ctbcinvestments.com.tw/CTWEB/FirstPage/DividendHistoryETF.aspx'),
  policy('009816','凱基台灣TOP50','市值型','不配息','凱基投信','https://www.kgifund.com.tw/Fund/Detail?fundID=J023'),
  policy('0052','富邦科技','主題型','年配','富邦投信','https://www.fubon.com/asset-management/fund/dividends/by_yield?Fd=0&contact=1&toDate=2026'),
  policy('00949','復華日本護城河','主題型','年配','復華投信','https://www.fhtrust.com.tw/ETF/etf_calendar'),
];
