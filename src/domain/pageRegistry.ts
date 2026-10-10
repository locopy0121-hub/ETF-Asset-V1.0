export type MainPageKey = 'home' | 'ledger' | 'portfolio' | 'market' | 'dividend' | 'ai' | 'settings';

export type MainPageDefinition = {
  key: MainPageKey;
  label: string;
  title: string;
};

export const MAIN_PAGES: readonly MainPageDefinition[] = [
  { key: 'home', label: '首頁', title: '資產儀表板' },
  { key: 'ledger', label: '紀錄', title: '帳務中心' },
  { key: 'portfolio', label: '庫存', title: '持股分析' },
  { key: 'dividend', label: '股息', title: '股息中心' },
  { key: 'ai', label: 'AI', title: 'AI 助理' },
  { key: 'settings', label: '設定', title: '控制中心' },
] as const;

/** Navigation-only extension. The protected settings page continues to use MAIN_PAGES unchanged. */
export const NAV_PAGES: readonly MainPageDefinition[]=[
  ...MAIN_PAGES.slice(0,3),
  {key:'market',label:'市場',title:'市場資訊中心'},
  ...MAIN_PAGES.slice(3),
];
