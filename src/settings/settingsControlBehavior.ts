import type { MainPageKey } from '../domain/pageRegistry';

export type AiControlPrefs=Readonly<{
  enabled:boolean;
  floatingButton:boolean;
}>;

export type ControlPrefs=Readonly<{
  pageTitles:Partial<Record<MainPageKey,string>>;
  ai:AiControlPrefs;
}>;

const PAGE_KEYS:readonly MainPageKey[]=['home','ledger','portfolio','dividend','ai','settings'];

function normalizeTitle(value:unknown){
  return typeof value==='string'?value.trim().slice(0,48):'';
}

export function normalizeControlPrefs(input:Partial<ControlPrefs>|null|undefined):ControlPrefs{
  const pageTitles:Partial<Record<MainPageKey,string>>={};
  const rawTitles=input?.pageTitles??{};
  for(const key of PAGE_KEYS){
    const title=normalizeTitle(rawTitles[key]);
    if(title)pageTitles[key]=title;
  }
  return {
    pageTitles,
    ai:{
      enabled:input?.ai?.enabled!==false,
      floatingButton:input?.ai?.floatingButton!==false,
    },
  };
}

export function patchPageTitle<T extends ControlPrefs>(current:T,page:MainPageKey,title:string):T{
  const normalized=normalizeTitle(title);
  const pageTitles={...current.pageTitles};
  if(normalized)pageTitles[page]=normalized;
  else delete pageTitles[page];
  return {...current,pageTitles} as T;
}

export function patchAiPrefs<T extends ControlPrefs>(current:T,patch:Partial<AiControlPrefs>):T{
  return {...current,ai:{...current.ai,...patch}} as T;
}

export function resolvePageTitle(page:MainPageKey,fallback:string,titles:ControlPrefs['pageTitles']){
  return titles[page]||fallback;
}

export function deriveAiUiState(ai:AiControlPrefs,activePage:MainPageKey){
  return {
    showAiTab:ai.enabled,
    showFloatingAi:ai.enabled&&ai.floatingButton,
    nextActivePage:!ai.enabled&&activePage==='ai'?'home':activePage,
  } as const;
}

export function toggleExclusivePanel<T extends string>(current:T|null,next:T):T|null{
  return current===next?null:next;
}
