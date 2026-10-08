// Generated from src/market/etfConstituents.ts; regenerate with scripts/build-etf-parser.cjs.
export const isEtfSymbol = (symbol) => /^00[0-9A-Z]{2,6}$/.test(symbol);
const text = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function dateIn(section) {
    const m = text(section).match(/(?:交易日期|資料日期|Trade Date)\s*[:：]?\s*(\d{4})[/-](\d{1,2})[/-](\d{1,2})/i);
    if (!m)
        return null;
    const date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const at = new Date(date + 'T00:00:00Z');
    return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === date ? date : null;
}
function validRows(rows) {
    if (!rows.length || rows.length > 2000)
        return null;
    const ids = new Set();
    let total = 0;
    for (const row of rows) {
        if (typeof row.symbol !== 'string' || typeof row.name !== 'string' || typeof row.weight !== 'number' ||
            !/^[A-Z0-9][A-Z0-9._-]{0,24}$/.test(row.symbol) || !row.name || row.name.length > 150 ||
            !Number.isFinite(row.weight) || row.weight < 0 || row.weight > 100 || ids.has(row.symbol))
            return null;
        ids.add(row.symbol);
        total += row.weight;
    }
    if (total > 101)
        return null;
    return rows.sort((a, b) => b.weight - a.weight || a.symbol.localeCompare(b.symbol));
}
/** Decode only primitive Nuxt arguments. Never eval issuer JavaScript. */
function nuxtScalars(script) {
    const names = script.match(/^window\.__NUXT__=\(function\(([^)]*)\)/)?.[1]?.split(',');
    const pos = script.lastIndexOf('}(');
    if (!names || pos < 0 || !script.endsWith('));'))
        return null;
    const raw = script.slice(pos + 2, -3), values = [];
    const scalar = /\s*("(?:\\.|[^"\\])*"|-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?|true|false|null|Array\(\d+\)|\{\}|\[\])\s*(,|$)/y;
    let index = 0;
    while (index < raw.length) {
        scalar.lastIndex = index;
        const m = scalar.exec(raw);
        if (!m)
            return null;
        values.push(/^(Array|\{|\[)/.test(m[1]) ? null : /^["tfn]/.test(m[1]) ? JSON.parse(m[1]) : Number(m[1]));
        index = scalar.lastIndex;
    }
    if (names.length !== values.length)
        return null;
    return new Map(names.map((name, i) => [name, values[i]]));
}
export function parseYuantaConstituents(html, symbol, fetchedAt) {
    if (!isEtfSymbol(symbol) || !new RegExp(`\\b${symbol}\\b`).test(text(html)))
        return null;
    const section = html.slice(html.indexOf('基金權重-股票'));
    const asOf = dateIn(section);
    if (!asOf)
        return null;
    const script = html.match(/window\.__NUXT__=[\s\S]*?(?=<\/script>)/)?.[0]?.trim();
    if (!script)
        return null;
    const scalars = nuxtScalars(script);
    if (!scalars)
        return null;
    const weights = script.match(/FundWeights:\{[\s\S]*?StockWeights:\[([^\]]*)\]/)?.[1];
    if (!weights)
        return null;
    const rows = [];
    const value = (token) => scalars.has(token) ? scalars.get(token) : /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(token) ? Number(token) : JSON.parse(token);
    try {
        for (const match of weights.matchAll(/\{([^{}]*)\}/g)) {
            const fields = new Map();
            for (const field of match[1].split(',')) {
                const m = field.match(/^\s*(\w+):\s*(.+)\s*$/);
                if (!m)
                    return null;
                fields.set(m[1], value(m[2].trim()));
            }
            if (typeof fields.get('code') !== 'string' || typeof fields.get('name') !== 'string' || typeof fields.get('weights') !== 'number')
                return null;
            rows.push({ symbol: fields.get('code'), name: fields.get('name'), weight: fields.get('weights') });
        }
    }
    catch {
        return null;
    }
    const valid = validRows(rows);
    if (!valid)
        return null;
    return { symbol, asOf, fetchedAt, source: '元大投信', sourceUrl: `https://www.yuantaetfs.com/product/detail/${symbol}/ratio`, complete: true, rows: valid };
}
export function parseMoneyDjConstituents(html, symbol, fetchedAt) {
    if (!isEtfSymbol(symbol) || !text(html).includes(`${symbol}.TW`))
        return null;
    const start = html.indexOf('持股明細');
    if (start < 0)
        return null;
    const section = html.slice(start), asOf = dateIn(section);
    if (!asOf)
        return null;
    const table = section.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0];
    if (!table || !text(table).includes('個股名稱') || !text(table).includes('投資比例'))
        return null;
    const rows = [];
    for (const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => text(m[1]));
        if (cells.length < 2)
            continue;
        const stock = cells[0].match(/^(.+?)\(([A-Z0-9][A-Z0-9._-]*\.([A-Z]{2,4}))\)$/);
        if (!stock || stock[3] === 'TF')
            continue;
        const number = cells[1].replace(/[% ,]/g, '');
        if (!/^\d+(?:\.\d+)?$/.test(number))
            return null;
        rows.push({ name: stock[1].trim(), symbol: stock[2].replace(/\.(TW|TWO)$/, ''), weight: Number(number) });
    }
    const valid = validRows(rows);
    if (!valid)
        return null;
    const complete = !/Basic0007B\.xdjhtm/i.test(section);
    return { symbol, asOf, fetchedAt, source: 'MoneyDJ 理財網', sourceUrl: `https://www.moneydj.com/ETF/X/Basic/Basic0007${complete ? 'B' : ''}.xdjhtm?etfid=${symbol}.TW`, complete, rows: valid };
}
const cache = new Map();
const listeners = new Set();
export function subscribeEtfConstituents(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const allCachedEtfConstituents = () => [...cache.values()];
export function restoreEtfConstituents(items) {
    if (!Array.isArray(items))
        return 0;
    let accepted = 0;
    for (const item of items.slice(0, 300)) {
        if (!item || typeof item !== 'object' || !isEtfSymbol(item.symbol ?? '') || !Array.isArray(item.rows) ||
            !Number.isFinite(item.fetchedAt) || item.fetchedAt <= 0 || typeof item.complete !== 'boolean' ||
            typeof item.source !== 'string' || typeof item.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.asOf) || !dateIn('資料日期：' + item.asOf) ||
            (item.basis !== undefined && !['issuer_disclosed', 'third_party_disclosed', 'pcf_estimated'].includes(item.basis)) ||
            typeof item.sourceUrl !== 'string' || !/^https:\/\/www\.(?:(?:yuantaetfs|moneydj)\.com|twse\.com\.tw)\//.test(item.sourceUrl))
            continue;
        if (item.rows.some((row) => !row || typeof row !== 'object'))
            continue;
        const rows = validRows(item.rows.map((row) => ({ symbol: row.symbol, name: row.name, weight: row.weight })));
        if (!rows)
            continue;
        accepted++;
        const old = cache.get(item.symbol);
        if (!old || old.asOf < item.asOf || (old.asOf === item.asOf && old.fetchedAt < item.fetchedAt && (!old.complete || item.complete)))
            cache.set(item.symbol, { ...item, rows });
    }
    for (const listener of listeners)
        listener();
    return accepted;
}
export const cachedEtfConstituents = (symbol) => cache.get(symbol) ?? null;
async function download(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok)
        throw new Error(`資料來源暫時不可用 (${response.status})`);
    const html = await response.text();
    if (html.length > 3_000_000)
        throw new Error('資料格式超出上限');
    return html;
}
export function normalizeEtfHoldingsApiUrl(value) {
    try {
        const url = new URL(value.trim());
        return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? url.toString().replace(/\/+$/, '') : '';
    }
    catch {
        return '';
    }
}
export async function fetchEtfConstituents(symbol, name, signal, apiUrl = '') {
    if (!isEtfSymbol(symbol))
        throw new Error('此標的不是 ETF');
    const backend = normalizeEtfHoldingsApiUrl(apiUrl);
    if (backend) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, 45000);
        try {
            if (signal.aborted)
                throw new Error('已取消');
            const response = await fetch(`${backend}/api/v1/etf/${symbol}/track`, { method: 'POST', signal: controller.signal });
            if (response.ok) {
                const value = await response.json();
                if (value?.symbol === symbol) {
                    const accepted = restoreEtfConstituents([value]);
                    const restored = cache.get(symbol);
                    if (accepted && restored)
                        return restored;
                }
            }
        }
        catch {
            if (signal.aborted)
                throw new Error('已取消');
        }
        finally {
            clearTimeout(timer);
            signal.removeEventListener('abort', abort);
        }
        // A configured server outage must not fan out all clients to upstream sites.
        throw new Error('成分股資料中心暫時不可用，保留已下載資料');
    }
    const sources = [];
    if (name.includes('元大'))
        sources.push({ url: `https://www.yuantaetfs.com/product/detail/${symbol}/ratio`, parse: parseYuantaConstituents });
    sources.push({ url: `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=${symbol}.TW`, parse: parseMoneyDjConstituents });
    sources.push({ url: `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${symbol}.TW`, parse: parseMoneyDjConstituents });
    for (const source of sources) {
        if (signal.aborted)
            throw new Error('已取消');
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, 12_000);
        try {
            const html = await download(source.url, controller.signal);
            if (signal.aborted)
                throw new Error('已取消');
            const result = source.parse(html, symbol, Date.now());
            if (result) {
                const previous = cache.get(symbol);
                if (previous && (previous.asOf > result.asOf || (previous.asOf === result.asOf && previous.complete && !result.complete)))
                    return previous;
                cache.set(symbol, result);
                for (const listener of listeners)
                    listener();
                return result;
            }
        }
        catch {
            if (signal.aborted)
                throw new Error('已取消');
        }
        finally {
            clearTimeout(timer);
            signal.removeEventListener('abort', abort);
        }
    }
    throw new Error('尚未取得成分股資料，請稍後重試');
}
