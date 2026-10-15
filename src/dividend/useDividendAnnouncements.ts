import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DIVIDEND_ANNOUNCEMENT_KEY,fetchDividendAnnouncements,mergeDividendAnnouncements,restoreDividendAnnouncementCache,type DividendAnnouncementCache} from './dividendAnnouncements';

/** Loading cached announcements never delays navigation or starts AI/price work. */
export function useDividendAnnouncements(){
 const [cache,setCache]=useState<DividendAnnouncementCache>({schema:1,rows:[],updatedAt:null});
 const [loading,setLoading]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [warning,setWarning]=useState('');
 const active=useRef(true),busy=useRef(false),current=useRef(cache);
 useEffect(()=>{
  active.current=true;
  AsyncStorage.getItem(DIVIDEND_ANNOUNCEMENT_KEY).then(raw=>{
   if(!active.current)return;
   const restored=restoreDividendAnnouncementCache(raw);current.current=restored;setCache(restored);
  }).catch(()=>{if(active.current)setError('已儲存的公告無法讀取，可重新取得資料；原帳務不受影響。');})
   .finally(()=>{if(active.current)setReady(true);});
  return ()=>{active.current=false;};
 },[]);
 const refresh=async()=>{
  if(!ready||busy.current)return;
  busy.current=true;setLoading(true);setError('');setWarning('');
  try{
   const result=await fetchDividendAnnouncements();
   if(!active.current)return;
   const next:DividendAnnouncementCache={schema:1,rows:mergeDividendAnnouncements(current.current.rows,result.rows),updatedAt:Date.now()};
   // Keep updated data visible if durable storage fails; explicitly report that it was not saved.
   current.current=next;setCache(next);setWarning(result.warnings.join('；'));
   try{await AsyncStorage.setItem(DIVIDEND_ANNOUNCEMENT_KEY,JSON.stringify(next));}
   catch{if(active.current)setWarning([...result.warnings,'公告已取得，但儲存失敗，請重試更新。'].join('；'));}
  }catch(reason){if(active.current)setError(reason instanceof Error?reason.message:'取得失敗，請重試。');}
  finally{busy.current=false;if(active.current)setLoading(false);}
 };
 return {...cache,loading,ready,error,warning,refresh};
}
