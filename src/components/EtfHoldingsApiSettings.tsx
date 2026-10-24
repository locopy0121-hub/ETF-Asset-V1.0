import {useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {normalizeEtfHoldingsApiUrl} from '../market/etfConstituents';
import {useSystemColors} from '../theme/useSystemColors';
export function EtfHoldingsApiSettings(){
  const settings=useSettingsRuntime(),colors=useSystemColors();
  const [url,setUrl]=useState(settings.prefs.etfHoldingsApiUrl??'');
  const valid=!url.trim()||!!normalizeEtfHoldingsApiUrl(url);
  return <View style={{gap:8,paddingVertical:12}}>
    <Text style={{color:colors.text,fontWeight:'800'}}>ETF 成分股資料</Text>
    <Text style={{color:colors.textSecondary,fontSize:12}}>新增持股自動下載；08:30／13:20／14:30 檢查更新。App 關閉時由資料中心排程更新，回前景補抓。</Text>
    <TextInput accessibilityLabel="ETF 成分股資料中心網址" autoCapitalize="none" autoCorrect={false}
      placeholder="資料中心 HTTPS 網址（選填）" value={url} onChangeText={setUrl}
      style={{color:colors.text,borderColor:colors.border,borderWidth:1,padding:10,borderRadius:8}}/>
    {!valid?<Text style={{color:colors.textSecondary}}>請輸入不含帳密或查詢參數的 HTTPS 網址。</Text>:null}
    <Pressable accessibilityRole="button" disabled={!valid} onPress={()=>settings.patchEtfHoldingsApiUrl(url)} style={{padding:12,minHeight:44}}>
      <Text style={{color:colors.primary,fontWeight:'800'}}>儲存成分股資料來源</Text></Pressable>
    <Text style={{color:colors.textSecondary,fontSize:12}}>{settings.prefs.etfHoldingsApiUrl?'已使用資料中心快取 API':'未設定資料中心：App 依持股事件與每日檢查直接取得公開資料。'}</Text>
  </View>;
}
