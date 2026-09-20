import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';
import { WidgetControlPanel } from '../components/widget/WidgetControlPanel';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { useBrokerSettingsRuntime, type RecurringFeeMode } from '../finance/BrokerSettingsRuntime';
import { useFinance } from '../finance/FinanceRuntime';
import { FINANCE_FORMULA_CATALOG } from '../finance/financeFormulaCatalog';
import { useMarketRuntime, type MarketUpdateConfig } from '../market/MarketRuntime';
import { useMonitorSettingsRuntime } from '../monitor/MonitorSettingsRuntime';
import {
  createLocalBackup,
  dataStorageSummary,
  exportTfAssetData,
  importTfAssetData,
  listLocalBackups,
  restoreLocalBackup,
  type BackupRecord,
} from '../settings/BackupService';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { colors, radius, spacing } from '../theme/tokens';
import { useWidgetSettingsRuntime } from '../widget/WidgetSettingsRuntime';

type PluginPanel=null|'widget'|'monitor';
type SystemPanel=null|'market'|'permissions'|'diagnostics'|'notifications';
type AccountingPanel=null|'formulas'|'broker'|'defaults'|'core';
type DataPanel=null|'catalog'|'summary'|'integrity'|'repair';
type BackupPanel=null|'create'|'export'|'import'|'restore'|'clear';
type MonitorPanel=null|'widget'|'main'|'mini'|'template'|'colors'|'refresh';
type DisplayPanel=null|'font'|'amount'|'percent'|'date'|'pnl';
type AppPanel=null|'reset'|'version'|'updates'|'debug';
type LegalPanel=null|'disclaimer'|'market'|'calculator'|'about';

const VERSION='1.0.4';
const BUILD='10004';

export function SettingsScreen(){
  const finance=useFinance();
  const market=useMarketRuntime();
  const broker=useBrokerSettingsRuntime();
  const settings=useSettingsRuntime();
  const monitor=useMonitorSettingsRuntime();
  const widget=useWidgetSettingsRuntime();

  const [top,setTop]=useState<string|null>(null);
  const [pluginPanel,setPluginPanel]=useState<PluginPanel>(null);
  const [systemPanel,setSystemPanel]=useState<SystemPanel>(null);
  const [accountingPanel,setAccountingPanel]=useState<AccountingPanel>(null);
  const [dataPanel,setDataPanel]=useState<DataPanel>(null);
  const [backupPanel,setBackupPanel]=useState<BackupPanel>(null);
  const [monitorPanel,setMonitorPanel]=useState<MonitorPanel>(null);
  const [displayPanel,setDisplayPanel]=useState<DisplayPanel>(null);
  const [appPanel,setAppPanel]=useState<AppPanel>(null);
  const [legalPanel,setLegalPanel]=useState<LegalPanel>(null);
  const [backups,setBackups]=useState<BackupRecord[]>([]);
  const [backupStatus,setBackupStatus]=useState('');
  const [exportText,setExportText]=useState('');
  const [importText,setImportText]=useState('');
  const [storageStats,setStorageStats]=useState({keys:0,bytes:0});
  const [notificationPermission,setNotificationPermission]=useState<'granted'|'denied'|'unsupported'>('unsupported');

  const toggleTop=(key:string)=>{
    setTop(current=>current===key?null:key);
    setPluginPanel(null);
    setSystemPanel(null);
    setAccountingPanel(null);
    setDataPanel(null);
    setBackupPanel(null);
    setMonitorPanel(null);
    setDisplayPanel(null);
    setAppPanel(null);
    setLegalPanel(null);
  };

  const reloadBackupMeta=async()=>{
    const [rows,stats]=await Promise.all([listLocalBackups(),dataStorageSummary()]);
    setBackups(rows);
    setStorageStats(stats);
  };

  useEffect(()=>{void reloadBackupMeta();},[]);
  useEffect(()=>{
    if(Platform.OS!=='android'||Number(Platform.Version)<33){
      setNotificationPermission('unsupported');
      return;
    }
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      .then(ok=>setNotificationPermission(ok?'granted':'denied'))
      .catch(()=>setNotificationPermission('denied'));
  },[]);

  const duplicates=useMemo(()=>{
    const ids=new Set<string>();
    return finance.entries.filter(entry=>{
      if(ids.has(entry.id))return true;
      ids.add(entry.id);
      return false;
    }).length;
  },[finance.entries]);

  const panelForTop=(key:string)=>{
    if(key==='system')return systemSection();
    if(key==='accounting')return accountingSection();
    if(key==='data')return dataSection();
    if(key==='backup')return backupSection();
    if(key==='monitor')return monitorSection();
    if(key==='display')return displaySection();
    if(key==='app')return appSection();
    if(key==='legal')return legalSection();
    return null;
  };

  function systemSection(){
    return <View style={styles.children}>
      <ChildButton label="市場更新" summary={marketPhaseLabel(market.phase)} active={systemPanel==='market'} onPress={()=>setSystemPanel(systemPanel==='market'?null:'market')}/>
      {systemPanel==='market'?<MarketPanel config={market.config} onChange={market.setConfig} refreshing={market.refreshing} onRefresh={()=>void market.refresh()} lastSuccessAt={market.lastSuccessAt} lastError={market.lastError}/>:null}
      <ChildButton label="背景執行與權限" summary={notificationPermission==='granted'?'通知已允許':'檢查系統權限'} active={systemPanel==='permissions'} onPress={()=>setSystemPanel(systemPanel==='permissions'?null:'permissions')}/>
      {systemPanel==='permissions'?<Panel title="背景執行與權限">
        <StatusRow label="通知權限" value={notificationPermission==='granted'?'已允許':notificationPermission==='denied'?'未允許':'依系統版本'}/>
        <StatusRow label="背景資料" value="由 Android 系統管理"/>
        <StatusRow label="電池最佳化" value="由 Android 系統管理"/>
        {Platform.OS==='android'&&Number(Platform.Version)>=33&&notificationPermission!=='granted'?<ActionButton label="要求通知權限" onPress={async()=>{
          const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          setNotificationPermission(result===PermissionsAndroid.RESULTS.GRANTED?'granted':'denied');
        }}/>:null}
        <ActionButton label="前往 App 系統設定" onPress={()=>void Linking.openSettings()}/>
        <Text style={styles.note}>Android 的電池最佳化與背景限制由系統頁面管理；此處不偽造無法可靠讀取的狀態。</Text>
      </Panel>:null}
      <ChildButton label="效能與診斷" summary={market.lastError?'行情有警告':'核心狀態正常'} active={systemPanel==='diagnostics'} onPress={()=>setSystemPanel(systemPanel==='diagnostics'?null:'diagnostics')}/>
      {systemPanel==='diagnostics'?<Panel title="效能與診斷">
        <StatusRow label="App 版本" value={VERSION}/>
        <StatusRow label="Build" value={BUILD}/>
        <StatusRow label="帳務 Runtime" value={finance.hydrated?'正常':'載入中'}/>
        <StatusRow label="行情 Runtime" value={market.hydrated?'正常':'載入中'}/>
        <StatusRow label="券商 Runtime" value={broker.hydrated?'正常':'載入中'}/>
        <StatusRow label="設定 Runtime" value={settings.hydrated?'正常':'載入中'}/>
        <StatusRow label="最後行情成功" value={formatTime(market.lastSuccessAt)}/>
        <StatusRow label="行情錯誤" value={market.lastError??'無'}/>
        <StatusRow label="交易紀錄" value={String(finance.entries.length)}/>
        <StatusRow label="持股筆數" value={String(finance.holdings.length)}/>
        <StatusRow label="ETF 基礎資料" value={String(market.catalog.length)}/>
      </Panel>:null}
      <ChildButton label="通知與提醒" summary="除息、配息、行情、失敗、備份" active={systemPanel==='notifications'} onPress={()=>setSystemPanel(systemPanel==='notifications'?null:'notifications')}/>
      {systemPanel==='notifications'?<NotificationPanel/>:null}
    </View>;
  }

  function accountingSection(){
    const p=broker.activeProfile;
    return <View style={styles.children}>
      <ChildButton label="帳務運算公式" summary={FINANCE_FORMULA_CATALOG.length+' 項 · 唯讀'} active={accountingPanel==='formulas'} onPress={()=>setAccountingPanel(accountingPanel==='formulas'?null:'formulas')}/>
      {accountingPanel==='formulas'?<Panel title="Canonical Finance Core 運算公式">
        <Text style={styles.note}>此清單只顯示金融核心規則，不在設定頁修改公式。</Text>
        {FINANCE_FORMULA_CATALOG.map(item=><View key={item.key} style={styles.formula}><Text style={styles.formulaTitle}>{item.title}</Text><Text style={styles.formulaText}>{item.formula}</Text>{item.note?<Text style={styles.note}>{item.note}</Text>:null}</View>)}
      </Panel>:null}
      <ChildButton label="券商與費率" summary={p.name} active={accountingPanel==='broker'} onPress={()=>setAccountingPanel(accountingPanel==='broker'?null:'broker')}/>
      {accountingPanel==='broker'?<BrokerFeeSettingsPanel/>:null}
      <ChildButton label="交易預設值" summary={settings.prefs.tradeDefaults.accountLabel} active={accountingPanel==='defaults'} onPress={()=>setAccountingPanel(accountingPanel==='defaults'?null:'defaults')}/>
      {accountingPanel==='defaults'?<Panel title="交易預設值">
        <ChoiceRow label="預設券商" options={broker.profiles.map(x=>({key:x.id,label:x.name}))} value={settings.prefs.tradeDefaults.brokerProfileId} onChange={brokerProfileId=>settings.patchTradeDefaults({brokerProfileId})}/>
        <Text style={styles.fieldLabel}>預設帳戶</Text>
        <TextInput style={styles.input} value={settings.prefs.tradeDefaults.accountLabel} onChangeText={accountLabel=>settings.patchTradeDefaults({accountLabel})}/>
        <ChoiceRow label="預設交易類型" options={[{key:'buy',label:'買進'},{key:'sell',label:'賣出'}]} value={settings.prefs.tradeDefaults.tradeKind} onChange={tradeKind=>settings.patchTradeDefaults({tradeKind:tradeKind==='sell'?'sell':'buy'})}/>
        <Text style={styles.note}>只影響之後新開啟的交易表單，不改歷史紀錄。</Text>
      </Panel>:null}
      <ChildButton label="帳務核心狀態" summary="Canonical · 歷史費稅鎖定" active={accountingPanel==='core'} onPress={()=>setAccountingPanel(accountingPanel==='core'?null:'core')}/>
      {accountingPanel==='core'?<Panel title="帳務核心狀態">
        <StatusRow label="金融核心" value="Canonical Finance Core"/>
        <StatusRow label="歷史手續費" value="actualFee 固化"/>
        <StatusRow label="歷史稅金" value="actualTax 固化"/>
        <StatusRow label="Consumer 規則" value="只讀 Snapshot"/>
        <StatusRow label="帳務序列" value={duplicates===0?'正常':'發現重複 ID'}/>
      </Panel>:null}
    </View>;
  }

  function dataSection(){
    return <View style={styles.children}>
      <ChildButton label="ETF 基礎資料" summary={market.catalog.length+' 筆'} active={dataPanel==='catalog'} onPress={()=>setDataPanel(dataPanel==='catalog'?null:'catalog')}/>
      {dataPanel==='catalog'?<Panel title="ETF 基礎資料">
        <StatusRow label="資料來源" value="TWSE + TPEx"/>
        <StatusRow label="ETF 資料筆數" value={String(market.catalog.length)}/>
        <ActionButton label={market.catalogRefreshing?'更新中…':'立即更新 ETF 基礎資料'} disabled={market.catalogRefreshing} onPress={()=>void market.refreshCatalog()}/>
        <Text style={styles.note}>記帳搜尋、代號提示與名稱解析共用 Market Runtime 的 ETF Catalog。</Text>
      </Panel>:null}
      <ChildButton label="資料概況" summary={finance.entries.length+' 筆交易 · '+finance.holdings.length+' 檔持股'} active={dataPanel==='summary'} onPress={()=>setDataPanel(dataPanel==='summary'?null:'summary')}/>
      {dataPanel==='summary'?<Panel title="資料概況">
        <StatusRow label="交易紀錄" value={String(finance.entries.length)}/>
        <StatusRow label="目前持股" value={String(finance.holdings.length)}/>
        <StatusRow label="行情標的" value={String(market.quotes.length)}/>
        <StatusRow label="ETF Catalog" value={String(market.catalog.length)}/>
        <StatusRow label="TF Asset 儲存鍵" value={String(storageStats.keys)}/>
        <StatusRow label="估算儲存大小" value={formatBytes(storageStats.bytes)}/>
        <ActionButton label="重新掃描資料概況" onPress={()=>void reloadBackupMeta()}/>
      </Panel>:null}
      <ChildButton label="資料完整性檢查" summary={duplicates===0?'目前正常':'需要處理'} active={dataPanel==='integrity'} onPress={()=>setDataPanel(dataPanel==='integrity'?null:'integrity')}/>
      {dataPanel==='integrity'?<Panel title="資料完整性檢查">
        <StatusRow label="重複 Ledger ID" value={duplicates===0?'0 · PASS':String(duplicates)}/>
        <StatusRow label="負持股防護" value="由 Canonical Ledger 驗證"/>
        <StatusRow label="金融核心來源" value="Single Source of Truth"/>
        <StatusRow label="行情來源" value={market.lastError?'警告：'+market.lastError:'正常'}/>
      </Panel>:null}
      <ChildButton label="資料修復" summary="安全重建，不改歷史費稅" active={dataPanel==='repair'} onPress={()=>setDataPanel(dataPanel==='repair'?null:'repair')}/>
      {dataPanel==='repair'?<Panel title="資料修復">
        <Text style={styles.note}>目前可安全執行的修復為重新更新 ETF Catalog 與行情；持股投影會由 Canonical Ledger 自動重建，不直接改寫歷史交易。</Text>
        <ActionButton label="重建 ETF 基礎資料" onPress={()=>void market.refreshCatalog()}/>
        <ActionButton label="重新取得行情" onPress={()=>void market.refresh()}/>
      </Panel>:null}
    </View>;
  }

  function backupSection(){
    return <View style={styles.children}>
      <ChildButton label="立即備份" summary={backups[0]?formatDate(backups[0].createdAt):'尚無本機備份'} active={backupPanel==='create'} onPress={()=>setBackupPanel(backupPanel==='create'?null:'create')}/>
      {backupPanel==='create'?<Panel title="立即備份">
        <StatusRow label="本機備份數" value={String(backups.length)}/>
        <StatusRow label="最後備份" value={backups[0]?formatDate(backups[0].createdAt):'尚無'}/>
        <ActionButton label="建立完整本機備份" onPress={async()=>{
          const row=await createLocalBackup();
          setBackupStatus('備份完成：'+formatDate(row.createdAt));
          await reloadBackupMeta();
        }}/>
        {backupStatus?<Text style={styles.success}>{backupStatus}</Text>:null}
      </Panel>:null}
      <ChildButton label="匯出資料" summary="TF Asset JSON" active={backupPanel==='export'} onPress={()=>setBackupPanel(backupPanel==='export'?null:'export')}/>
      {backupPanel==='export'?<Panel title="匯出資料">
        <ActionButton label="產生匯出內容" onPress={async()=>setExportText(await exportTfAssetData())}/>
        {exportText?<TextInput style={[styles.input,styles.multiline]} multiline value={exportText} onChangeText={setExportText}/>:null}
        <Text style={styles.note}>匯出內容可全選複製保存；不包含其他 App 的資料。</Text>
      </Panel>:null}
      <ChildButton label="匯入資料" summary="先驗證再寫入" active={backupPanel==='import'} onPress={()=>setBackupPanel(backupPanel==='import'?null:'import')}/>
      {backupPanel==='import'?<Panel title="匯入資料">
        <TextInput style={[styles.input,styles.multiline]} multiline placeholder="貼上 TF Asset 匯出的 JSON" value={importText} onChangeText={setImportText}/>
        <ActionButton label="驗證並匯入" disabled={!importText.trim()} onPress={async()=>{
          try{
            const count=await importTfAssetData(importText);
            setBackupStatus('匯入完成 '+count+' 個資料區；重新啟動 App 後載入。');
            await reloadBackupMeta();
          }catch(error){Alert.alert('匯入失敗',error instanceof Error?error.message:String(error));}
        }}/>
        {backupStatus?<Text style={styles.success}>{backupStatus}</Text>:null}
      </Panel>:null}
      <ChildButton label="還原備份" summary={backups.length+' 份可用'} active={backupPanel==='restore'} onPress={()=>setBackupPanel(backupPanel==='restore'?null:'restore')}/>
      {backupPanel==='restore'?<Panel title="還原備份">
        {backups.length===0?<Text style={styles.note}>目前沒有本機備份。</Text>:backups.map(row=><Pressable key={row.id} style={styles.restoreRow} onPress={()=>Alert.alert('確認還原','還原前會先建立目前狀態的安全備份。',[{text:'取消',style:'cancel'},{text:'還原',onPress:()=>void restoreLocalBackup(row.id).then(()=>{setBackupStatus('還原完成；重新啟動 App 後載入。');void reloadBackupMeta();})}])}>
          <View style={{flex:1}}><Text style={styles.rowTitle}>{formatDate(row.createdAt)}</Text><Text style={styles.note}>{row.keys} 個資料區 · {formatBytes(row.bytes)} · v{row.appVersion}</Text></View><Text style={styles.chevron}>›</Text>
        </Pressable>)}
        {backupStatus?<Text style={styles.success}>{backupStatus}</Text>:null}
      </Panel>:null}
      <ChildButton label="清除帳務資料" summary="危險操作 · 只清 Ledger" danger active={backupPanel==='clear'} onPress={()=>setBackupPanel(backupPanel==='clear'?null:'clear')}/>
      {backupPanel==='clear'?<Panel title="清除帳務資料">
        <Text style={styles.dangerText}>會清除：期初現金、買進／賣出／股息／其他 Ledger，以及由它們投影出的持股。</Text>
        <Text style={styles.note}>不會清除：券商設定、行情設定、ETF Catalog、顯示設定與 Monitor 設定。</Text>
        <ActionButton danger label="建立安全備份後清除帳務" onPress={()=>Alert.alert('第一次確認','將清除全部帳務資料，但保留其他設定。',[{text:'取消',style:'cancel'},{text:'繼續',style:'destructive',onPress:()=>Alert.alert('最後確認','此操作會讓 Ledger 變成空白、期初現金變為 0。',[{text:'取消',style:'cancel'},{text:'確認清除',style:'destructive',onPress:()=>void createLocalBackup().then(()=>{finance.clearFinance();setBackupStatus('帳務資料已清除，安全備份已建立。');void reloadBackupMeta();})}])}])}/>
        {backupStatus?<Text style={styles.success}>{backupStatus}</Text>:null}
      </Panel>:null}
    </View>;
  }

  function monitorSection(){
    return <View style={styles.children}>
      <Text style={styles.hiddenContractText}>Floating Monitor（浮動即時視窗）</Text>
      <ChildButton label="Widget（mobile 桌面）" summary={widget.config.enabled?'已啟用 · '+widget.config.size:'未啟用'} active={monitorPanel==='widget'} onPress={()=>setMonitorPanel(monitorPanel==='widget'?null:'widget')}/>
      {monitorPanel==='widget'?<WidgetControlPanel value={widget.config} onChange={widget.setConfig}/>:null}
      <ChildButton label="監控器總設定" summary={monitor.config.enabled?'已啟用':'未啟用'} active={monitorPanel==='main'} onPress={()=>setMonitorPanel(monitorPanel==='main'?null:'main')}/>
      {monitorPanel==='main'?<MonitorControlPanel value={monitor.config} onChange={monitor.setConfig}/>:null}
      <ChildButton label="Mini 模式" summary={monitor.config.mode==='mini'?'目前 Mini':'目前 Normal'} active={monitorPanel==='mini'} onPress={()=>setMonitorPanel(monitorPanel==='mini'?null:'mini')}/>
      {monitorPanel==='mini'?<Panel title="Mini 模式">
        <StatusRow label="目前模式" value={monitor.config.mode==='mini'?'Mini':'Normal'}/>
        <StatusRow label="Mini 尺寸" value={monitor.config.miniLayout.width+' × '+monitor.config.miniLayout.height}/>
        <Text style={styles.note}>Normal 與 Mini Layout 物理隔離，Mini 調整不覆蓋 Normal。</Text>
      </Panel>:null}
      <ChildButton label="共用模板" summary={monitor.config.template} active={monitorPanel==='template'} onPress={()=>setMonitorPanel(monitorPanel==='template'?null:'template')}/>
      {monitorPanel==='template'?<Panel title="共用模板">
        <ChoiceRow label="模板" options={[{key:'portfolio',label:'投資組合'},{key:'quotes',label:'純行情'},{key:'compact',label:'精簡'}]} value={monitor.config.template} onChange={template=>monitor.setConfig({...monitor.config,template:template==='quotes'||template==='compact'?template:'portfolio'})}/>
      </Panel>:null}
      <ChildButton label="損益顏色" summary={settings.prefs.display.profitColorMode==='red-up-green-down'?'紅漲綠跌':'綠漲紅跌'} active={monitorPanel==='colors'} onPress={()=>setMonitorPanel(monitorPanel==='colors'?null:'colors')}/>
      {monitorPanel==='colors'?<ProfitColorPanel/>:null}
      <ChildButton label="呼吸燈與刷新" summary={monitor.config.showBreathingLight?'呼吸燈開':'呼吸燈關'} active={monitorPanel==='refresh'} onPress={()=>setMonitorPanel(monitorPanel==='refresh'?null:'refresh')}/>
      {monitorPanel==='refresh'?<Panel title="呼吸燈與刷新">
        <ToggleRow label="顯示呼吸燈" value={monitor.config.showBreathingLight} onChange={showBreathingLight=>monitor.setConfig({...monitor.config,showBreathingLight})}/>
        <StatusRow label="行情刷新基準" value={marketPhaseLabel(market.phase)}/>
        <StatusRow label="最後行情更新" value={formatTime(market.lastSuccessAt)}/>
        <Text style={styles.note}>Monitor 只讀 Shared Snapshot，刷新頻率沿用 Market Runtime，不建立第二套行情引擎。</Text>
      </Panel>:null}
    </View>;
  }

  function displaySection(){
    const d=settings.prefs.display;
    return <View style={styles.children}>
      <ChildButton label="字體與顯示大小" summary={Math.round(d.fontScale*100)+'%'} active={displayPanel==='font'} onPress={()=>setDisplayPanel(displayPanel==='font'?null:'font')}/>
      {displayPanel==='font'?<Panel title="字體與顯示大小"><Stepper label="字體比例" value={Math.round(d.fontScale*100)} min={80} max={140} step={5} suffix="%" onChange={v=>settings.patchDisplay({fontScale:v/100})}/></Panel>:null}
      <ChildButton label="金額格式" summary={d.amountDecimals===2?'2 位小數':'整數'} active={displayPanel==='amount'} onPress={()=>setDisplayPanel(displayPanel==='amount'?null:'amount')}/>
      {displayPanel==='amount'?<Panel title="金額格式">
        <ChoiceRow label="小數位" options={[{key:'0',label:'整數'},{key:'2',label:'2 位'}]} value={String(d.amountDecimals)} onChange={x=>settings.patchDisplay({amountDecimals:x==='2'?2:0})}/>
        <ToggleRow label="千分位" value={d.thousandsSeparator} onChange={thousandsSeparator=>settings.patchDisplay({thousandsSeparator})}/>
      </Panel>:null}
      <ChildButton label="百分比格式" summary={d.percentDecimals+' 位小數'} active={displayPanel==='percent'} onPress={()=>setDisplayPanel(displayPanel==='percent'?null:'percent')}/>
      {displayPanel==='percent'?<Panel title="百分比格式"><ChoiceRow label="小數位" options={[0,1,2].map(x=>({key:String(x),label:x+' 位'}))} value={String(d.percentDecimals)} onChange={x=>settings.patchDisplay({percentDecimals:x==='0'?0:x==='1'?1:2})}/></Panel>:null}
      <ChildButton label="日期格式" summary={d.dateFormat} active={displayPanel==='date'} onPress={()=>setDisplayPanel(displayPanel==='date'?null:'date')}/>
      {displayPanel==='date'?<Panel title="日期格式"><ChoiceRow label="日期格式" options={[{key:'YYYY-MM-DD',label:'2026-09-21'},{key:'YYYY/MM/DD',label:'2026/09/21'}]} value={d.dateFormat} onChange={dateFormat=>settings.patchDisplay({dateFormat:dateFormat==='YYYY/MM/DD'?'YYYY/MM/DD':'YYYY-MM-DD'})}/></Panel>:null}
      <ChildButton label="損益顏色" summary={d.profitColorMode==='red-up-green-down'?'紅漲綠跌':'綠漲紅跌'} active={displayPanel==='pnl'} onPress={()=>setDisplayPanel(displayPanel==='pnl'?null:'pnl')}/>
      {displayPanel==='pnl'?<ProfitColorPanel/>:null}
    </View>;
  }

  function appSection(){
    return <View style={styles.children}>
      <ChildButton label="還原預設設定" summary="只重設 Preferences" active={appPanel==='reset'} onPress={()=>setAppPanel(appPanel==='reset'?null:'reset')}/>
      {appPanel==='reset'?<Panel title="還原預設設定">
        <Text style={styles.note}>只重設通知、顯示格式與交易預設值，不刪除交易、股息、持股與帳務資料。</Text>
        <ActionButton label="還原 App Preferences" onPress={()=>Alert.alert('確認重設','帳務資料不會被刪除。',[{text:'取消',style:'cancel'},{text:'重設',onPress:settings.resetPreferences}])}/>
      </Panel>:null}
      <ChildButton label="版本資訊" summary={'v'+VERSION+' · '+BUILD} active={appPanel==='version'} onPress={()=>setAppPanel(appPanel==='version'?null:'version')}/>
      {appPanel==='version'?<Panel title="版本資訊">
        <StatusRow label="App" value="TF Asset｜資產管家"/>
        <StatusRow label="Version" value={VERSION}/>
        <StatusRow label="Android versionCode" value={BUILD}/>
        <StatusRow label="設定 Schema" value={String(settings.prefs.schema)}/>
      </Panel>:null}
      <ChildButton label="更新資訊" summary="設定控制中心 8 大主區塊" active={appPanel==='updates'} onPress={()=>setAppPanel(appPanel==='updates'?null:'updates')}/>
      {appPanel==='updates'?<Panel title="V1.0.4 更新資訊">
        <Text style={styles.infoText}>設定頁升級為 8 大控制中心；新增持久化 Settings Runtime、Monitor Runtime、備份／匯入匯出、資料概況、通知、格式、診斷與安全清除帳務。</Text>
      </Panel>:null}
      <ChildButton label="開發／診斷資訊" summary="Runtime 狀態" active={appPanel==='debug'} onPress={()=>setAppPanel(appPanel==='debug'?null:'debug')}/>
      {appPanel==='debug'?<Panel title="開發／診斷資訊">
        <StatusRow label="Market Phase" value={market.phase}/>
        <StatusRow label="Market Source" value={market.config.source}/>
        <StatusRow label="Broker Profile ID" value={broker.activeProfileId}/>
        <StatusRow label="Monitor Mode" value={monitor.config.mode}/>
        <StatusRow label="Stored TF Asset keys" value={String(storageStats.keys)}/>
      </Panel>:null}
    </View>;
  }

  function legalSection(){
    return <View style={styles.children}>
      <ChildButton label="免責聲明" summary="投資資訊不構成建議" active={legalPanel==='disclaimer'} onPress={()=>setLegalPanel(legalPanel==='disclaimer'?null:'disclaimer')}/>
      {legalPanel==='disclaimer'?<Panel title="免責聲明"><Text style={styles.infoText}>TF Asset 用於個人資產紀錄、行情整理與試算。App 所呈現之行情、損益、殖利率與試算結果僅供資訊與紀錄用途，不構成投資建議或獲利保證。</Text></Panel>:null}
      <ChildButton label="行情資料聲明" summary="TWSE / TPEx · 可能延遲" active={legalPanel==='market'} onPress={()=>setLegalPanel(legalPanel==='market'?null:'market')}/>
      {legalPanel==='market'?<Panel title="行情資料聲明"><Text style={styles.infoText}>行情來自公開市場資料來源，可能因網路、來源服務、休市、盤後或裝置背景限制而延遲。帳務核心不把行情延遲視為歷史交易資料。</Text></Panel>:null}
      <ChildButton label="試算聲明" summary="假設結果非保證報酬" active={legalPanel==='calculator'} onPress={()=>setLegalPanel(legalPanel==='calculator'?null:'calculator')}/>
      {legalPanel==='calculator'?<Panel title="試算聲明"><Text style={styles.infoText}>所有情境試算均依輸入條件計算，不代表未來實際市場價格、配息或報酬。</Text></Panel>:null}
      <ChildButton label="關於 TF Asset" summary={'Version '+VERSION} active={legalPanel==='about'} onPress={()=>setLegalPanel(legalPanel==='about'?null:'about')}/>
      {legalPanel==='about'?<Panel title="關於 TF Asset"><StatusRow label="名稱" value="TF Asset｜資產管家"/><StatusRow label="版本" value={VERSION}/><StatusRow label="核心原則" value="Single Source of Truth"/></Panel>:null}
    </View>;
  }

  function NotificationPanel(){
    const n=settings.prefs.notifications;
    return <Panel title="通知與提醒">
      <StatusRow label="Android 通知權限" value={notificationPermission==='granted'?'已允許':notificationPermission==='denied'?'未允許':'依系統版本'}/>
      <ToggleRow label="除息提醒" value={n.exDividend} onChange={exDividend=>settings.patchNotifications({exDividend})}/>
      <ToggleRow label="配息提醒" value={n.dividend} onChange={dividend=>settings.patchNotifications({dividend})}/>
      <ToggleRow label="行情異常提醒" value={n.marketAlert} onChange={marketAlert=>settings.patchNotifications({marketAlert})}/>
      <ToggleRow label="更新失敗提醒" value={n.updateFailure} onChange={updateFailure=>settings.patchNotifications({updateFailure})}/>
      <ToggleRow label="備份提醒" value={n.backupReminder} onChange={backupReminder=>settings.patchNotifications({backupReminder})}/>
      <ToggleRow label="震動" value={n.vibration} onChange={vibration=>settings.patchNotifications({vibration})}/>
      <ToggleRow label="聲音" value={n.sound} onChange={sound=>settings.patchNotifications({sound})}/>
      <Stepper label="提前提醒" value={n.leadDays} min={0} max={30} step={1} suffix=" 天" onChange={leadDays=>settings.patchNotifications({leadDays})}/>
      {notificationPermission==='denied'?<Text style={styles.note}>偏好會保存，但 Android 通知權限尚未允許，因此通知目前不會實際送出。</Text>:null}
    </Panel>;
  }

  function ProfitColorPanel(){
    const value=settings.prefs.display.profitColorMode;
    return <Panel title="損益顏色">
      <ChoiceRow label="顯示規則" options={[{key:'red-up-green-down',label:'紅漲綠跌'},{key:'green-up-red-down',label:'綠漲紅跌'}]} value={value} onChange={profitColorMode=>settings.patchDisplay({profitColorMode:profitColorMode==='green-up-red-down'?'green-up-red-down':'red-up-green-down'})}/>
      <Text style={styles.note}>設定集中保存；後續所有 Consumer 應使用同一 Color Resolver，不自行硬編碼。</Text>
    </Panel>;
  }

  return <View style={styles.root}>
    <View style={styles.header}>
      <Text style={styles.eyebrow}>TF ASSET</Text>
      <Text style={styles.title}>控制中心</Text>
      <Text style={styles.subtitle}>系統、帳務、資料與顯示設定集中管理</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {PAGE_FRAMES.settings.map((frame,index)=>{
        const open=top===frame.key;
        return <View key={frame.key} style={styles.section}>
          <Pressable style={styles.topRow} onPress={()=>toggleTop(frame.key)}>
            <View style={styles.index}><Text style={styles.indexText}>{index+1}</Text></View>
            <View style={{flex:1}}>
              <Text style={styles.sectionTitle}>{frame.title}</Text>
              <Text style={styles.sectionDesc}>{frame.description}</Text>
            </View>
            <Text style={styles.chevron}>{open?'⌄':'›'}</Text>
          </Pressable>
          {open?panelForTop(frame.key):null}
        </View>;
      })}
      <View style={{height:24}}/>
    </ScrollView>
  </View>;
}


type BrokerDraft={
  commissionRatePct:string;
  commissionDiscountPct:string;
  minimumRoundLot:string;
  minimumOddLot:string;
  recurringMode:RecurringFeeMode;
  recurringFixedFee:string;
  recurringDiscountPct:string;
  recurringMinimumFee:string;
};

function BrokerFeeSettingsPanel(){
  const runtime=useBrokerSettingsRuntime();
  const makeDraft=():BrokerDraft=>({
    commissionRatePct:String(runtime.activeProfile.commissionRate*100),
    commissionDiscountPct:String(runtime.activeProfile.commissionDiscount*100),
    minimumRoundLot:String(runtime.activeProfile.minimumCommissionRoundLot),
    minimumOddLot:String(runtime.activeProfile.minimumCommissionOddLot),
    recurringMode:runtime.recurring.mode,
    recurringFixedFee:String(runtime.recurring.fixedFee),
    recurringDiscountPct:String(runtime.recurring.discount*100),
    recurringMinimumFee:String(runtime.recurring.minimumFee),
  });
  const [draft,setDraft]=useState<BrokerDraft>(makeDraft);

  useEffect(()=>{setDraft(makeDraft());},[
    runtime.activeProfile.id,
    runtime.activeProfile.commissionRate,
    runtime.activeProfile.commissionDiscount,
    runtime.activeProfile.minimumCommissionRoundLot,
    runtime.activeProfile.minimumCommissionOddLot,
    runtime.recurring.mode,
    runtime.recurring.fixedFee,
    runtime.recurring.discount,
    runtime.recurring.minimumFee,
  ]);

  const nonNegative=(text:string,fallback:number)=>{
    const n=Number(text.trim());
    return Number.isFinite(n)&&n>=0?n:fallback;
  };
  const save=()=>{
    runtime.setProfile({
      ...runtime.activeProfile,
      commissionRate:nonNegative(draft.commissionRatePct,runtime.activeProfile.commissionRate*100)/100,
      commissionDiscount:nonNegative(draft.commissionDiscountPct,runtime.activeProfile.commissionDiscount*100)/100,
      minimumCommissionRoundLot:nonNegative(draft.minimumRoundLot,runtime.activeProfile.minimumCommissionRoundLot),
      minimumCommissionOddLot:nonNegative(draft.minimumOddLot,runtime.activeProfile.minimumCommissionOddLot),
    });
    runtime.setRecurring(runtime.activeProfile.id,{
      mode:draft.recurringMode,
      fixedFee:nonNegative(draft.recurringFixedFee,runtime.recurring.fixedFee),
      discount:nonNegative(draft.recurringDiscountPct,runtime.recurring.discount*100)/100,
      minimumFee:nonNegative(draft.recurringMinimumFee,runtime.recurring.minimumFee),
    });
  };

  return <Panel title="券商與手續費設定">
    <Text style={styles.note}>設定只影響之後的公式預估；歷史已固化的實際手續費／實際證交稅不回算。所有金額欄位允許 0 元。</Text>
    <ChoiceRow label="券商 Profile" options={runtime.profiles.map(x=>({key:x.id,label:x.name}))} value={runtime.activeProfileId} onChange={runtime.setActiveProfileId}/>
    <Text style={styles.subTitle}>一般交易</Text>
    <SettingNumberRow label="公定手續費率" suffix="%" value={draft.commissionRatePct} onChange={commissionRatePct=>setDraft(current=>({...current,commissionRatePct}))}/>
    <SettingNumberRow label="電子下單折扣率" suffix="%" value={draft.commissionDiscountPct} onChange={commissionDiscountPct=>setDraft(current=>({...current,commissionDiscountPct}))}/>
    <SettingNumberRow label="整股最低手續費" suffix="元" value={draft.minimumRoundLot} onChange={minimumRoundLot=>setDraft(current=>({...current,minimumRoundLot}))}/>
    <SettingNumberRow label="零股最低手續費" suffix="元" value={draft.minimumOddLot} onChange={minimumOddLot=>setDraft(current=>({...current,minimumOddLot}))}/>
    <Text style={styles.subTitle}>定期定額</Text>
    <ChoiceRow label="計費模式" options={[{key:'fixed',label:'固定單筆'},{key:'variable',label:'非固定'}]} value={draft.recurringMode} onChange={recurringMode=>setDraft(current=>({...current,recurringMode:recurringMode==='variable'?'variable':'fixed'}))}/>
    {draft.recurringMode==='fixed'
      ?<SettingNumberRow label="固定單筆手續費" suffix="元" value={draft.recurringFixedFee} onChange={recurringFixedFee=>setDraft(current=>({...current,recurringFixedFee}))}/>
      :<>
        <SettingNumberRow label="定期定額折扣率" suffix="%" value={draft.recurringDiscountPct} onChange={recurringDiscountPct=>setDraft(current=>({...current,recurringDiscountPct}))}/>
        <SettingNumberRow label="定期定額最低手續費" suffix="元" value={draft.recurringMinimumFee} onChange={recurringMinimumFee=>setDraft(current=>({...current,recurringMinimumFee}))}/>
      </>}
    <Text style={styles.subTitle}>證交稅規則</Text>
    <StatusRow label="ETF" value="0.1%"/>
    <StatusRow label="一般股票" value="0.3%"/>
    <View style={styles.actionRow}>
      <Pressable style={styles.resetAction} onPress={()=>runtime.resetProfile(runtime.activeProfile.id)}><Text style={styles.resetActionText}>重設</Text></Pressable>
      <Pressable style={styles.saveAction} onPress={save}><Text style={styles.saveActionText}>更新設定</Text></Pressable>
    </View>
  </Panel>;
}

function SettingNumberRow({label,suffix,value,onChange}:{label:string;suffix:string;value:string;onChange:(value:string)=>void}){
  return <View style={styles.statusRow}>
    <Text style={styles.statusLabel}>{label}</Text>
    <View style={styles.numberEditor}><TextInput keyboardType="decimal-pad" value={value} onChangeText={onChange} style={styles.settingNumberInput}/><Text style={styles.note}>{suffix}</Text></View>
  </View>;
}

type MarketPanelProps={
  config:MarketUpdateConfig;
  onChange:(next:MarketUpdateConfig)=>void;
  refreshing:boolean;
  onRefresh:()=>void;
  lastSuccessAt:number|null;
  lastError:string|null;
};

function MarketPanel({config,onChange,refreshing,onRefresh,lastSuccessAt,lastError}:MarketPanelProps){
  const patch=(next:Partial<MarketUpdateConfig>)=>onChange({...config,...next});
  return <Panel title="市場更新">
    <StatusRow label="行情來源" value={config.source}/>
    <StatusRow label="最近成功" value={formatTime(lastSuccessAt)}/>
    <StatusRow label="最近錯誤" value={lastError??'無'}/>
    <ActionButton label={refreshing?'更新中…':'立即更新行情'} disabled={refreshing} onPress={onRefresh}/>
    <ToggleRow label="啟用市場更新排程" value={config.scheduleEnabled} onChange={scheduleEnabled=>patch({scheduleEnabled})}/>
    <ToggleRow label="回到前景立即刷新" value={config.refreshOnForeground} onChange={refreshOnForeground=>patch({refreshOnForeground})}/>
    <ToggleRow label="停止全部自動更新" value={config.stopAll} onChange={stopAll=>patch({stopAll})}/>
    <View style={[styles.scheduleBox,config.stopAll&&styles.disabledBox]}>
      <ToggleRow label="盤中排程" value={config.live.enabled} disabled={config.stopAll} onChange={enabled=>onChange({...config,live:{...config.live,enabled}})}/>
      <TimeFields start={config.live.start} end={config.live.end} disabled={config.stopAll} onStart={start=>onChange({...config,live:{...config.live,start}})} onEnd={end=>onChange({...config,live:{...config.live,end}})}/>
      <Stepper label="盤中更新頻率" value={config.live.refreshSeconds} min={1} max={3600} step={1} suffix=" 秒" disabled={config.stopAll} onChange={refreshSeconds=>onChange({...config,live:{...config.live,refreshSeconds}})}/>
    </View>
    <View style={[styles.scheduleBox,config.stopAll&&styles.disabledBox]}>
      <ToggleRow label="盤後排程" value={config.afterHours.enabled} disabled={config.stopAll} onChange={enabled=>onChange({...config,afterHours:{...config.afterHours,enabled}})}/>
      <TimeFields start={config.afterHours.start} end={config.afterHours.end} disabled={config.stopAll} onStart={start=>onChange({...config,afterHours:{...config.afterHours,start}})} onEnd={end=>onChange({...config,afterHours:{...config.afterHours,end}})}/>
      <Stepper label="盤後更新頻率" value={config.afterHours.refreshSeconds} min={1} max={3600} step={1} suffix=" 秒" disabled={config.stopAll} onChange={refreshSeconds=>onChange({...config,afterHours:{...config.afterHours,refreshSeconds}})}/>
    </View>
  </Panel>;
}

function Panel({title,children}:{title:string;children:React.ReactNode}){
  return <View style={styles.panel}><Text style={styles.panelTitle}>{title}</Text>{children}</View>;
}

function ChildButton({label,summary,active,onPress,danger=false}:{label:string;summary:string;active:boolean;onPress:()=>void;danger?:boolean}){
  return <Pressable style={[styles.childRow,active&&styles.childActive]} onPress={onPress}>
    <View style={{flex:1}}><Text style={[styles.rowTitle,danger&&styles.dangerText]}>{label}</Text><Text style={styles.note}>{summary}</Text></View>
    <Text style={styles.chevron}>{active?'⌄':'›'}</Text>
  </Pressable>;
}

function StatusRow({label,value}:{label:string;value:string}){
  return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>;
}

function ToggleRow({label,value,onChange,disabled=false}:{label:string;value:boolean;onChange:(value:boolean)=>void;disabled?:boolean}){
  return <View style={[styles.toggleRow,disabled&&styles.disabledBox]}><Text style={styles.rowTitle}>{label}</Text><Switch value={value} disabled={disabled} onValueChange={onChange}/></View>;
}

function ActionButton({label,onPress,disabled=false,danger=false}:{label:string;onPress:()=>void;disabled?:boolean;danger?:boolean}){
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.action,disabled&&styles.actionDisabled,danger&&styles.actionDanger]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

function NumberField({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){
  return <View><Text style={styles.fieldLabel}>{label}</Text><TextInput keyboardType="decimal-pad" style={styles.input} value={String(value)} onChangeText={text=>{const n=Number(text);if(Number.isFinite(n))onChange(n);}}/></View>;
}

function ChoiceRow({label,options,value,onChange}:{label:string;options:readonly {key:string;label:string}[];value:string;onChange:(key:string)=>void}){
  return <View><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choiceWrap}>{options.map(option=><Pressable key={option.key} onPress={()=>onChange(option.key)} style={[styles.choice,value===option.key&&styles.choiceActive]}><Text style={[styles.choiceText,value===option.key&&styles.choiceTextActive]}>{option.label}</Text></Pressable>)}</View></View>;
}

function Stepper({label,value,min,max,step,suffix,onChange,disabled=false}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void;disabled?:boolean}){
  return <View><Text style={styles.fieldLabel}>{label}</Text><View style={styles.stepRow}><Pressable disabled={disabled||value<=min} style={styles.stepButton} onPress={()=>onChange(Math.max(min,value-step))}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.stepValue}>{value}{suffix}</Text><Pressable disabled={disabled||value>=max} style={styles.stepButton} onPress={()=>onChange(Math.min(max,value+step))}><Text style={styles.stepText}>＋</Text></Pressable></View></View>;
}

function TimeFields({start,end,onStart,onEnd,disabled}:{start:string;end:string;onStart:(value:string)=>void;onEnd:(value:string)=>void;disabled:boolean}){
  return <View style={styles.timeRow}><View style={{flex:1}}><Text style={styles.fieldLabel}>開始時間</Text><TextInput editable={!disabled} style={styles.input} value={start} onChangeText={onStart}/></View><View style={{flex:1}}><Text style={styles.fieldLabel}>結束時間</Text><TextInput editable={!disabled} style={styles.input} value={end} onChangeText={onEnd}/></View></View>;
}

function formatTime(value:number|null){
  if(!value)return '尚無';
  try{return new Date(value).toLocaleString('zh-TW');}catch{return String(value);}
}
function formatDate(value:string){
  try{return new Date(value).toLocaleString('zh-TW');}catch{return value;}
}
function formatBytes(bytes:number){
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1024/1024).toFixed(1)+' MB';
}
function marketPhaseLabel(phase:'live'|'afterHours'|'offline'){
  return phase==='live'?'盤中':phase==='afterHours'?'盤後':'休市／未排程';
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  header:{paddingHorizontal:spacing.lg,paddingTop:spacing.lg,paddingBottom:spacing.md},
  eyebrow:{fontSize:10,fontWeight:'900',color:colors.primary,letterSpacing:1.4},
  title:{fontSize:28,fontWeight:'900',color:colors.text,marginTop:2},
  subtitle:{fontSize:12,color:colors.textSecondary,marginTop:3},
  content:{paddingHorizontal:spacing.md,gap:10},
  section:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  topRow:{minHeight:70,flexDirection:'row',alignItems:'center',gap:12,padding:14},
  index:{width:28,height:28,borderRadius:9,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  indexText:{fontSize:11,fontWeight:'900',color:colors.primary},
  sectionTitle:{fontSize:15,fontWeight:'900',color:colors.text},
  sectionDesc:{fontSize:10,color:colors.textSecondary,marginTop:3},
  chevron:{fontSize:20,fontWeight:'800',color:colors.textSecondary},
  children:{padding:10,paddingTop:0,gap:8},
  childRow:{flexDirection:'row',alignItems:'center',padding:12,borderRadius:radius.md,backgroundColor:colors.background,borderWidth:1,borderColor:colors.border},
  childActive:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  panel:{gap:10,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  panelTitle:{fontSize:14,fontWeight:'900',color:colors.text},
  rowTitle:{fontSize:12,fontWeight:'800',color:colors.text},
  note:{fontSize:10,lineHeight:15,color:colors.textSecondary},
  statusRow:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12,paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  statusLabel:{fontSize:11,fontWeight:'700',color:colors.textSecondary,flex:1},
  statusValue:{fontSize:11,fontWeight:'800',color:colors.text,textAlign:'right',flex:1.4},
  toggleRow:{minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  fieldLabel:{fontSize:10,fontWeight:'900',color:colors.textSecondary,marginBottom:5},
  input:{minHeight:40,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:10,paddingVertical:8,fontSize:12,color:colors.text},
  multiline:{minHeight:150,textAlignVertical:'top',fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:9},
  choiceWrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  choiceActive:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:colors.primary},
  action:{minHeight:42,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:12},
  actionDanger:{backgroundColor:colors.gain},
  actionDisabled:{opacity:0.45},
  actionText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},
  formula:{padding:10,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:4},
  formulaTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  formulaText:{fontSize:10,lineHeight:15,color:colors.text},
  restoreRow:{flexDirection:'row',alignItems:'center',padding:10,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  success:{fontSize:10,fontWeight:'800',color:colors.loss},
  dangerText:{fontSize:11,fontWeight:'900',color:colors.gain},
  infoText:{fontSize:11,lineHeight:18,color:colors.text},
  subTitle:{fontSize:11,fontWeight:'900',color:colors.text,marginTop:4},
  numberEditor:{flexDirection:'row',alignItems:'center',gap:6},
  settingNumberInput:{minWidth:88,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:9,paddingVertical:7,color:colors.text,textAlign:'right',fontSize:11,fontWeight:'900',backgroundColor:colors.surface},
  actionRow:{flexDirection:'row',gap:8,marginTop:4},
  resetAction:{flex:1,minHeight:40,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},
  resetActionText:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  saveAction:{flex:1,minHeight:40,borderRadius:radius.md,alignItems:'center',justifyContent:'center',backgroundColor:colors.primary},
  saveActionText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},
  scheduleBox:{gap:8,padding:10,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  disabledBox:{opacity:0.5},
  timeRow:{flexDirection:'row',gap:8},
  stepRow:{flexDirection:'row',alignItems:'center',gap:10},
  stepButton:{width:40,height:38,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},
  stepText:{fontSize:18,fontWeight:'900',color:colors.primary},
  stepValue:{minWidth:84,textAlign:'center',fontSize:12,fontWeight:'900',color:colors.text},
  hiddenContractText:{height:0,opacity:0,fontSize:1},
});
