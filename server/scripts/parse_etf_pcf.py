"""Parse a downloaded PCF CSV and same-date closing prices; never label it fund holdings.
Usage: python parse_etf_pcf.py --symbol 0050 --as-of 2026-10-08 \
 --pcf pcf.csv --prices closes.csv --source-url https://www.twse.com.tw/... --cash 0
CSV contracts: PCF symbol,name,quantity,cash_substitution; prices symbol,close,date.
Source-specific column mapping must be verified before calling this parser.
"""
import argparse,csv,json,re
from datetime import date,datetime,timezone
from decimal import Decimal
from urllib.parse import urlparse


def parse_pcf(symbol,as_of,rows,prices,cash=Decimal(0),source_url=''):
    if not re.fullmatch(r'00[0-9A-Z]{2,6}',symbol):raise ValueError('Invalid ETF symbol')
    date.fromisoformat(as_of)
    if cash<0 or not cash.is_finite():raise ValueError('Invalid cash amount')
    source=urlparse(source_url)
    if source.scheme!='https' or source.hostname not in ('www.twse.com.tw','wwwc.twse.com.tw','www.yuantaetfs.com'):
        raise ValueError('Use an independently verified official PCF source URL')
    by_symbol={}
    for quote in prices:
        if quote['date']!=as_of:raise ValueError('All closing prices must match the PCF valuation date')
        price=Decimal(quote['close'].replace(',',''))
        if not price.is_finite() or price<=0:raise ValueError('Invalid closing price')
        if quote['symbol'] in by_symbol:raise ValueError('Duplicate price')
        by_symbol[quote['symbol']]=price
    amounts=[];seen=set()
    for row in rows:
        key=row['symbol'].strip();quantity=Decimal(row['quantity'].replace(',',''))
        if key in seen or not quantity.is_finite() or quantity<=0:raise ValueError('Invalid or duplicate PCF row')
        seen.add(key)
        if row.get('cash_substitution','N').upper() not in ('N',''):
            raise ValueError('Cash-substitution PCF requires issuer-specific treatment; do not fabricate stock weight')
        if key not in by_symbol:raise ValueError('Missing same-date price: '+key)
        amounts.append((key,row['name'],quantity*by_symbol[key]))
    denominator=sum((amount for _,_,amount in amounts),cash)
    if not amounts or denominator<=0:raise ValueError('Empty PCF')
    output=[{'symbol':key,'name':name,'weight':float((amount/denominator*100).quantize(Decimal('.000001')))} for key,name,amount in amounts]
    return {'symbol':symbol,'asOf':as_of,'fetchedAt':int(datetime.now(timezone.utc).timestamp()*1000),
      'source':'Official PCF basket estimate','sourceUrl':source_url,'basis':'pcf_estimated',
      'complete':True,'rows':sorted(output,key=lambda row:-row['weight']),
      'note':'PCF basket estimate; not the actual portfolio weight. Cash/derivative treatment must be verified.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--symbol',required=True);parser.add_argument('--as-of',required=True)
    parser.add_argument('--pcf',required=True);parser.add_argument('--prices',required=True)
    parser.add_argument('--source-url',required=True);parser.add_argument('--cash',default='0');args=parser.parse_args()
    with open(args.pcf,encoding='utf-8-sig',newline='') as pcf,open(args.prices,encoding='utf-8-sig',newline='') as prices:
        print(json.dumps(parse_pcf(args.symbol,args.as_of,list(csv.DictReader(pcf)),list(csv.DictReader(prices)),Decimal(args.cash),args.source_url),ensure_ascii=False,indent=2))
