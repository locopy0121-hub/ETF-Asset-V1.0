import type {MainPageKey} from './pageRegistry';
export function acceptsEditorSession(session:{page:MainPageKey;frameKey:string},active:MainPageKey,hasDetail:boolean,hasChart:boolean):boolean{
  if(session.page==='home'&&['app-navigation','floating-ai'].includes(session.frameKey))return !hasDetail&&!hasChart;
  if(hasChart)return session.page==='portfolio'&&session.frameKey.startsWith('chart-');
  return session.page===(hasDetail?'portfolio':active)&&!session.frameKey.startsWith('chart-');
}
