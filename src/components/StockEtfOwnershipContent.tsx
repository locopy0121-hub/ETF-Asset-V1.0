import {useEffect,useMemo,useState} from 'react';
import {AppState,Linking,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {useSystemColors} from '../theme/useSystemColors';
import {useLayoutRuntime} from '../editor/LayoutSelectionContext';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {allCachedEtfConstituents,normalizeEtfHoldingsApiUrl,subscribeEtfConstituents} from '../market/etfConstituents';
import {hydrateEtfConstituentCache} from '../market/EtfConstituentsRuntime';
import {localStockEtfOwners,mergeStockEtfOwners,taipeiDisclosureDate,validateStockEtfOwners,type StockEtfOwner} from '../market/etfStockOwnership';

const EMPTY_ETF_NAMES:Readonly<Record<string,string>>={};
export function StockEtfOwnershipContent({symbol,etfNames=EMPTY_ETF_NAMES,onSelectEtf}:{
  symbol:string;etfNames?:Readonly<Record<string,string>>;onSelectEtf?:(symbol:string,name:string)=>void;
}){
  const colors=useSystemColors(),preview=useLayoutRuntime().active,settings=useSettingsRuntime();
  const [local,setLocal]=useState<StockEtfOwner[]>([]);
  const [remote,setRemote]=useState<StockEtfOwner[]>([]);
  const [coverage,setCoverage]=useState<number|null>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [reload,setReload]=useState(0);
  const apiUrl=normalizeEtfHoldingsApiUrl(settings.prefs.etfHoldingsApiUrl??'');
  useEffect(()=>{
    let mounted=true;
    const sync=()=>{if(mounted)setLocal(localStockEtfOwners(symbol,allCachedEtfConstituents(),etfNames));};
    sync();const off=subscribeEtfConstituents(sync);
    void hydrateEtfConstituentCache().then(sync);
    return()=>{mounted=false;off();};
  },[symbol,etfNames]);
  useEffect(()=>{
    let alive=true;const abort=new AbortController();
    setRemote([]);setCoverage(null);setError(null);
    if(preview||!apiUrl||AppState.currentState!=='active'){setLoading(false);return()=>abort.abort();}
    setLoading(true);
    void fetch(apiUrl+'/api/v1/etf/stock/'+encodeURIComponent(symbol)+'/owners',{signal:abort.signal})
      .then(async response=>{if(!response.ok)throw new Error('資料中心暫時不可用 '+response.status);return response.json();})
      .then(value=>{
        const verified=validateStockEtfOwners(value,symbol);
        if(!verified)throw new Error('ETF 持股資料格式未通過驗證');
        if(alive){setRemote(verified.rows);setCoverage(verified.coverage);}
      }).catch(()=>{if(alive)setError('反查資料中心尚無完整資料；以下只顯示本機已下載的 ETF。');})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;abort.abort();};
  },[apiUrl,symbol,reload,preview]);
  const owners=useMemo(()=>mergeStockEtfOwners(local,remote),[local,remote]);
  const today=taipeiDisclosureDate(),todayOwners=owners.filter(row=>row.asOf===today);
  return <View style={{gap:10}}>
    <Text style={{fontWeight:'800',color:colors.text}}>個股 ETF 持有狀況 · {symbol}</Text>
    <Text style={{fontSize:12,lineHeight:19,color:colors.textSecondary}}>
      {todayOwners.length?('今日揭露 '+todayOwners.length+' 檔 · '):'今日資料尚未核實 · '}
      已取得 {owners.length} 檔 ETF 持有紀錄
      {coverage===null?' · 僅已下載／已追蹤清單':' · 伺服器已建立 '+coverage+' 檔 ETF 快照索引'}
    </Text>
    <Text style={{fontSize:12,lineHeight:19,color:colors.textSecondary}}>
      資料日期以各投信或來源實際揭露為準，並非盤中即時增減持股。未收錄的 ETF 不代表沒有持有此股；
      PCF 是申購買回組合，與基金實際持股可能不同。
    </Text>
    <Pressable accessibilityRole="button" accessibilityLabel="重新查詢個股 ETF 持股" disabled={loading||preview}
      onPress={()=>setReload(v=>v+1)} style={{backgroundColor:colors.surfaceMuted,borderRadius:10,padding:11,alignSelf:'flex-start',minHeight:44}}>
      <Text style={{color:colors.primary,fontWeight:'700'}}>{loading?'查詢中…':'重新查詢已揭露 ETF'}</Text>
    </Pressable>
    {!apiUrl?<Text style={{color:colors.textSecondary,fontSize:12}}>尚未設定 ETF 資料中心；目前僅反查 App 已載入的 ETF，不能宣稱全市場結果。</Text>:null}
    {!owners.length?<Text style={{color:colors.textSecondary,fontSize:13}}>目前的已取得資料中尚無此股的 ETF 持有紀錄；不代表全市場 ETF 均未持有。</Text>:null}
    {owners.map(owner=><View key={owner.etfSymbol} style={{gap:5,paddingVertical:10,borderBottomWidth:.5,borderBottomColor:colors.border}}>
      <Pressable accessibilityRole="button" accessibilityLabel={'查看 ETF '+owner.etfSymbol+' 持股明細'}
        disabled={preview||!onSelectEtf} onPress={()=>onSelectEtf?.(owner.etfSymbol,owner.etfName)}>
        <Text style={{color:colors.primary,fontWeight:'800'}}>{owner.etfSymbol} · {owner.etfName}</Text>
      </Pressable>
      <Text style={{color:colors.text,fontWeight:'700'}}>持股權重 {owner.weight.toFixed(2)}%
        {owner.quantity!==null&&owner.basis!=='pcf_estimated'?' · '+owner.quantity.toLocaleString('zh-TW')+' 股':''}
      </Text>
      <Text style={{fontSize:11,color:colors.textSecondary}}>資料 {owner.asOf}{owner.asOf===today?'（今日揭露）':'（非今日）'} · {owner.source}
        {owner.complete?'':' · 部分資料'}{owner.basis==='pcf_estimated'?' · PCF 估算':''}
      </Text>
      <Pressable accessibilityRole="link" disabled={preview} onPress={()=>void Linking.openURL(owner.sourceUrl).catch(()=>{})}>
        <Text style={{fontSize:11,color:colors.primary}}>查看持股資料來源</Text>
      </Pressable>
    </View>)}
    {error?<Text accessibilityLiveRegion="polite" style={{fontSize:12,color:colors.textSecondary}}>{error}</Text>:null}
  </View>;
}
