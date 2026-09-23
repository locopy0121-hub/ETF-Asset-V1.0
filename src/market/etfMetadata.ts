import type {VerifiedIssuerDividendPolicy} from './issuerDividendPolicies';

/** ETF reference-data normalization only. This module must never calculate ledger/portfolio amounts. */
export type EtfCatalogItem = Readonly<{
  symbol: string;
  name: string;
  market: 'TWSE' | 'TPEx' | 'fallback';
  etfType?: string | null;
  dividendType?: string | null;
  metadataSource?: string | null;
  metadataVerifiedAt?: number | null;
  dividendSource?: string | null;
  dividendSourceUrl?: string | null;
  dividendVerifiedAt?: number | null;
}>;

type OfficialMetadata = Readonly<{
  symbol: string;
  name?: string;
  etfType?: string | null;
  dividendType?: string | null;
  metadataSource: string;
  metadataVerifiedAt: number;
  dividendSource?: string | null;
  dividendSourceUrl?: string | null;
  dividendVerifiedAt?: number | null;
}>;

const ETF_SYMBOL = /^00[0-9A-Z]{2,6}$/;
const compact = (value: unknown) => String(value ?? '').replace(/[\s　]+/g, '').trim();
const officialField = (row: Record<string, unknown>, ...names: string[]) => {
  for (const name of names) {
    const value = compact(row[name]);
    if (value) return value;
  }
  return '';
};

/** Maps only an explicitly supplied source category, never the ETF name or holding history. */
export function normalizeOfficialEtfType(value: unknown): string | null {
  const text = compact(value);
  if (!text) return null;
  if (/反向|反1倍|反向一倍/.test(text)) return '反向型';
  if (/槓桿|正向2倍|正向兩倍|兩倍槓桿/.test(text)) return '槓桿型';
  if (/主動式|主動型|主動管理|主動ETF/i.test(text)) return '主動式';
  if (/債券|公司債|公債|固定收益|高收益債/.test(text)) return '債券型';
  if (/高股息|高息|股息策略|股利策略/.test(text)) return '高股息型';
  if (/商品|黃金|白銀|原油/.test(text)) return '商品型';
  if (/市值|大型權值|大型股|臺灣50|台灣50/.test(text)) return '市值型';
  if (/主題|科技|半導體|低碳|ESG|永續/.test(text)) return '主題型';
  return null;
}

/** A monthly evaluation is not a promise to distribute monthly. */
export function normalizeOfficialDividendType(value: unknown): string | null {
  const text = compact(value);
  if (!text || /評價|可能不分配|視情況|尚未公告/.test(text)) return null;
  if (/不配息|不分配收益|收益不分配|累積型/.test(text)) return '不配息';
  if (/不定期|非定期|不固定/.test(text)) return '不定期';
  if (/雙月|每兩個月|每2個月|隔月/.test(text)) return '雙月配';
  if (/半年|每六個月|每6個月|一年兩次|每年兩次/.test(text)) return '半年配';
  if (/季配|每季|每三個月|每3個月|一年四次/.test(text)) return '季配';
  if (/月配|每月配息|每月分配|每月收益分配|按月分配/.test(text)) return '月配';
  if (/年配|每年配息|每年一次|一年一次/.test(text)) return '年配';
  return null;
}

/** Returns null when the official row provides no reliably classifiable information. */
export function parseOfficialEtfRow(raw: Record<string, unknown>, fetchedAt: number): OfficialMetadata | null {
  const symbol = officialField(raw, '基金代號', '證券代號', '基金證券代號', 'ETF代號', 'ETF 代號').toUpperCase();
  if (!ETF_SYMBOL.test(symbol)) return null;
  const category = officialField(raw, '基金類型', '投資類型', 'ETF類別', 'ETF 類型', '指數類型');
  const payout = officialField(raw, '收益分配頻率', '配息頻率', '收益分配政策', '配息政策');
  // The official fund-basic-data feed publishes index names but typically has no payout-policy field.
  // Use only explicit official index wording for a presentation category; do not guess payout from a name.
  const indexName = officialField(raw, '標的指數/追蹤指數名稱', '標的指數／追蹤指數名稱', '標的指數名稱', '追蹤指數名稱');
  const etfType = normalizeOfficialEtfType(category) ?? (
    /高股息|高息|股息|股利/.test(indexName) ? '高股息型' :
    /臺灣50|台灣50|臺灣五十|台灣五十|TOP50|大型權值|市值/.test(indexName) ? '市值型' : null
  );
  const dividendType = normalizeOfficialDividendType(payout);
  if (!etfType && !dividendType) return null;
  const name = officialField(raw, '基金中文名稱', '基金簡稱', '基金名稱', 'ETF名稱', '證券名稱');
  return {
    symbol,
    ...(name ? { name } : {}),
    etfType,
    dividendType,
    metadataSource: 'TWSE 基金基本資料彙總表',
    metadataVerifiedAt: fetchedAt,
    ...(dividendType?{dividendSource:'TWSE 官方 ETF 基本資料',dividendSourceUrl:'https://openapi.twse.com.tw/v1/opendata/t187ap47_L',dividendVerifiedAt:fetchedAt}:{}),
  };
}

/** The official metadata is joined by symbol even when no live quote was returned. */
export function mergeEtfCatalog(
  fallback: readonly EtfCatalogItem[],
  previous: readonly EtfCatalogItem[],
  observed: readonly EtfCatalogItem[],
  official: readonly OfficialMetadata[],
  issuerPolicies:readonly VerifiedIssuerDividendPolicy[]=[],
): EtfCatalogItem[] {
  const bySymbol = new Map<string, EtfCatalogItem>();
  for (const item of [...fallback, ...previous, ...observed]) {
    const existing = bySymbol.get(item.symbol);
    bySymbol.set(item.symbol, {
      ...existing,
      ...item,
      name: item.name && item.name !== item.symbol ? item.name : existing?.name ?? item.symbol,
      etfType: item.etfType ?? existing?.etfType ?? null,
      dividendType: item.dividendType ?? existing?.dividendType ?? null,
      metadataSource: item.metadataSource ?? existing?.metadataSource ?? null,
      metadataVerifiedAt: item.metadataVerifiedAt ?? existing?.metadataVerifiedAt ?? null,
      dividendSource: item.dividendSource ?? existing?.dividendSource ?? null,
      dividendSourceUrl: item.dividendSourceUrl ?? existing?.dividendSourceUrl ?? null,
      dividendVerifiedAt: item.dividendVerifiedAt ?? existing?.dividendVerifiedAt ?? null,
    });
  }
  for (const item of official) {
    const existing = bySymbol.get(item.symbol);
    bySymbol.set(item.symbol, {
      symbol: item.symbol,
      name: item.name || existing?.name || item.symbol,
      market: existing?.market ?? 'fallback',
      etfType: item.etfType ?? existing?.etfType ?? null,
      dividendType: item.dividendType ?? existing?.dividendType ?? null,
      metadataSource: item.metadataSource,
      metadataVerifiedAt: item.metadataVerifiedAt,
      dividendSource:item.dividendType ? (item.dividendSource??item.metadataSource) : (existing?.dividendSource??null),
      dividendSourceUrl:item.dividendType ? (item.dividendSourceUrl??null) : (existing?.dividendSourceUrl??null),
      dividendVerifiedAt:item.dividendType ? (item.dividendVerifiedAt??item.metadataVerifiedAt) : (existing?.dividendVerifiedAt??null),
    });
  }
  // An audited issuer policy fills empty / legacy values even without a quote or network.
  // Explicit newer exchange payout-policy fields supersede the dated issuer snapshot.
  for(const policy of issuerPolicies){
    const existing=bySymbol.get(policy.symbol);
    const newerPolicy=!!existing?.dividendType && (existing.dividendVerifiedAt??0)>policy.verifiedAt;
    bySymbol.set(policy.symbol,{
      symbol:policy.symbol,
      name:existing?.name && existing.name!==policy.symbol?existing.name:policy.name,
      market:existing?.market??'fallback',
      etfType:existing?.etfType??policy.etfType,
      dividendType:newerPolicy?(existing?.dividendType??policy.dividendType):policy.dividendType,
      metadataSource:existing?.metadataSource??null,
      metadataVerifiedAt:existing?.metadataVerifiedAt??null,
      dividendSource:newerPolicy?existing!.dividendSource??null:policy.issuer,
      dividendSourceUrl:newerPolicy?existing!.dividendSourceUrl??null:policy.sourceUrl,
      dividendVerifiedAt:newerPolicy?existing!.dividendVerifiedAt??null:policy.verifiedAt,
    });
  }
  return [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function shouldRefreshEtfCatalog(fetchedAt: number | null | undefined, now = Date.now(), ttlMs = 24 * 60 * 60 * 1000) {
  return !fetchedAt || !Number.isFinite(fetchedAt) || now < fetchedAt || now - fetchedAt >= ttlMs;
}
