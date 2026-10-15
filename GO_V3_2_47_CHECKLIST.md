# TF Asset V3.2.47 GO Checklist

## 目標
- 正式資料來源採「ALL FREE · NO MONEY」硬規則。
- 不允許付費 API、綁信用卡、自動扣款或試用期依賴成為必要來源。
- 台股仍以 TWSE／TPEx 為主真值。
- OpenFIGI 僅作零成本證券身分備援，不取代官方台股資料。

## 實裝
- [x] 建立 V3.2.46 備份分支。
- [x] 版本升級 V3.2.47 / Android versionCode 30247。
- [x] 建立 App 零成本資料源 Registry。
- [x] 建立 Market Center 零成本政策 Gate。
- [x] TWSE MIS / TWSE Daily / TPEx Daily / Yahoo public fallback 可用。
- [x] TWSE MIS ETF NAV 可用。
- [x] Fugle / Shioaji / plan-dependent NAV feed 在嚴格模式中停用。
- [x] Twelve Data / Marketstack / EODHD / Alpha Vantage / FinBridge 不列入正式零成本 Registry。
- [x] OpenFIGI 加入證券代號解析的零成本 fallback。
- [x] AI Ingredient Catalog 加入 OpenFIGI fallback provenance。
- [x] Settings 新增「API 成本政策：ALL FREE · NO MONEY」。
- [x] Backend status health 回傳每個來源的 policy。
- [x] 新增 App / Backend 零成本政策 regression gates。
- [x] Immutable Finance Core 未修改。

## 固定規則
```
monetaryCost = 0
creditCardRequired = false
autoBillingAllowed = false
trialOnly = false
```

任何來源只要無法符合全部條件，就不得成為 TF Asset 正式必要依賴。
