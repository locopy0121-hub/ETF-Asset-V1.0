import type { RelationNode } from './relationship';

export const PLUGIN_CONTROL_NODES:readonly RelationNode[]=[
  {id:'plugins',kind:'plugin-root',label:'外掛設定'},
  {id:'widget',kind:'plugin',label:'Widget',parentId:'plugins'},
  {id:'widget-settings',kind:'settings',label:'Widget 設定',parentId:'widget'},
  {id:'widget-size',kind:'setting-section',label:'尺寸',parentId:'widget-settings'},
  {id:'widget-template',kind:'setting-section',label:'模板',parentId:'widget-settings'},
  {id:'widget-fields',kind:'setting-section',label:'顯示欄位',parentId:'widget-settings'},
  {id:'widget-appearance',kind:'setting-section',label:'外觀',parentId:'widget-settings'},
  {id:'widget-tap',kind:'setting-section',label:'點擊行為',parentId:'widget-settings'},
  {id:'widget-update',kind:'setting-section',label:'更新摘要',parentId:'widget-settings'},

  {id:'monitor',kind:'plugin',label:'Floating Monitor',parentId:'plugins'},
  {id:'monitor-settings',kind:'settings',label:'Floating Monitor 設定',parentId:'monitor'},
  {id:'monitor-size',kind:'setting-section',label:'視窗尺寸',parentId:'monitor-settings'},
  {id:'monitor-template',kind:'setting-section',label:'模板',parentId:'monitor-settings'},
  {id:'monitor-fields',kind:'setting-section',label:'顯示欄位',parentId:'monitor-settings'},
  {id:'monitor-appearance',kind:'setting-section',label:'外觀',parentId:'monitor-settings'},
  {id:'monitor-tap',kind:'setting-section',label:'點擊行為',parentId:'monitor-settings'},
  {id:'monitor-update',kind:'setting-section',label:'更新摘要',parentId:'monitor-settings'},
  {id:'monitor-floating',kind:'setting-section',label:'浮動行為',parentId:'monitor-settings'},
];
