import {PAGE_FRAMES} from './frameRegistry';

export const EDITOR_FRAMES: typeof PAGE_FRAMES={...PAGE_FRAMES,settings:[{key:'page-header',title:'控制中心表頭',description:'頁面標題、副標與右側設定'},...PAGE_FRAMES.settings]};
