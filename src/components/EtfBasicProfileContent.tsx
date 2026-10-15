import {useEffect,useRef,useState} from 'react';
import {Linking,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {MarketEditableText,MarketPreviewActionGuard} from './MarketEditableContent';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {loadEtfBasicProfile} from '../market/EtfBasicProfileService';
import {profileRows,type EtfBasicProfile} from '../market/etfBasicProfile';

export function EtfBasicProfileContent({symbol,market}:{symbol:string;market:string}){
  const {palette}=useThemeRuntime();
  const [profile,setProfile]=useState<EtfBasicProfile|null>(null),[warning,setWarning]=useState<string|null>(null),[loading,setLoading]=useState(true),[reload,setReload]=useState({symbol,count:0});
  const lastForced=useRef('');
  useEffect(()=>{let alive=true;setLoading(true);setWarning(null);setProfile(null);
    const key=reload.symbol+':'+reload.count,force=reload.symbol===symbol&&reload.count>0&&lastForced.current!==key;
    if(force)lastForced.current=key;
    void loadEtfBasicProfile(symbol,force).then(result=>{if(alive){setProfile(result.profile);setWarning(result.warning);}})
      .catch(()=>{if(alive)setWarning('尚未取得 ETF 基本資料，請稍後重試');}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[symbol,reload]);
  return <View style={{gap:8}}>
    <Text editorId="market:etf-profile:title" style={{fontWeight:'800',color:palette.text}}>ETF 基本資料</Text>
    <MarketPreviewActionGuard><Pressable accessibilityRole="button" accessibilityLabel="更新 ETF 基本資料" disabled={loading} onPress={()=>setReload(v=>({symbol,count:v.symbol===symbol?v.count+1:1}))} style={{alignSelf:'flex-start',padding:12,minHeight:44}}>
      <Text style={{color:palette.primary,fontWeight:'700'}}>{loading?'讀取 ETF 基本資料…':'更新基本資料'}</Text>
    </Pressable></MarketPreviewActionGuard>
    {profileRows(profile,symbol,market).map(row=><View key={row.key} style={{paddingVertical:10,borderBottomWidth:.5,borderBottomColor:palette.border,gap:5}}>
      <View style={{flexDirection:row.key==='strategy'?'column':'row',gap:8}}>
        <MarketEditableText id={'market:details:fact:'+row.label+':label'} label={row.label+'標籤'} style={{fontSize:12,color:palette.textSecondary,...(row.key!=='strategy'?{flex:1}:{})}}>{row.label}</MarketEditableText>
        <MarketEditableText id={'market:details:fact:'+row.label+':value'} label={row.label+'數值'} kind="value" style={{fontSize:13,lineHeight:21,fontWeight:'600',color:palette.text,...(row.key!=='strategy'?{flex:2,textAlign:'right' as const}:{})}}>{row.value}</MarketEditableText>
      </View>
      {row.source?<MarketPreviewActionGuard><Pressable accessibilityRole="link" accessibilityLabel={'查看'+row.label+'資料來源'} onPress={()=>{if(row.sourceUrl)void Linking.openURL(row.sourceUrl).catch(()=>setWarning('暫時無法開啟資料來源'));}}>
        <Text style={{fontSize:10,color:palette.textSecondary,textAlign:'right'}}>{row.source}{row.asOf?' · '+row.asOf:''}</Text>
      </Pressable></MarketPreviewActionGuard>:null}
    </View>)}
    <Text style={{fontSize:11,lineHeight:18,color:palette.textSecondary}}>收盤價、淨值與規模依各欄資料日期顯示。費率保留來源定義；追蹤指數與基準指數分開列示。</Text>
    {warning?<Text accessibilityLiveRegion="polite" style={{fontSize:12,color:palette.textSecondary}}>{warning}</Text>:null}
  </View>;
}
