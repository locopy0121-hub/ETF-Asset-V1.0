import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  builtInBrokerProfiles,
  defaultBrokerProfile,
  normalizeBrokerProfile,
  normalizeBrokerProfiles,
  type BrokerProfile,
} from '../data/brokerProfiles';

export type RecurringFeeMode='fixed'|'variable';
export type RecurringFeeSettings=Readonly<{
  mode:RecurringFeeMode;
  fixedFee:number;
  discount:number;
  minimumFee:number;
}>;

type PersistedBrokerSettings=Readonly<{
  schema:1;
  activeProfileId:string;
  profiles:BrokerProfile[];
  recurringByProfile:Record<string,RecurringFeeSettings>;
}>;

type BrokerSettingsRuntimeValue=Readonly<{
  hydrated:boolean;
  profiles:readonly BrokerProfile[];
  activeProfileId:string;
  activeProfile:BrokerProfile;
  recurring:RecurringFeeSettings;
  recurringProfile:BrokerProfile;
  setActiveProfileId:(id:string)=>void;
  setProfile:(profile:BrokerProfile)=>void;
  setRecurring:(profileId:string,next:RecurringFeeSettings)=>void;
  resetProfile:(profileId:string)=>void;
}>;

const STORAGE_KEY='@tf-asset/broker-fee-settings';
const DEFAULT_RECURRING:RecurringFeeSettings={
  mode:'fixed',
  fixedFee:1,
  discount:0.65,
  minimumFee:1,
};

const finiteNonNegative=(value:unknown,fallback:number)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,n):fallback;
};

const normalizeRecurring=(value:Partial<RecurringFeeSettings>|undefined):RecurringFeeSettings=>({
  mode:value?.mode==='variable'?'variable':'fixed',
  fixedFee:finiteNonNegative(value?.fixedFee,DEFAULT_RECURRING.fixedFee),
  discount:finiteNonNegative(value?.discount,DEFAULT_RECURRING.discount),
  minimumFee:finiteNonNegative(value?.minimumFee,DEFAULT_RECURRING.minimumFee),
});

const defaultRecurringMap=()=>Object.fromEntries(
  builtInBrokerProfiles.map(profile=>[profile.id,{...DEFAULT_RECURRING}]),
) as Record<string,RecurringFeeSettings>;

const BrokerSettingsRuntimeContext=createContext<BrokerSettingsRuntimeValue|null>(null);

export function BrokerSettingsRuntimeProvider({children}:PropsWithChildren){
  const initialProfiles=normalizeBrokerProfiles(builtInBrokerProfiles);
  const [profiles,setProfiles]=useState<BrokerProfile[]>(initialProfiles);
  const [activeProfileId,setActiveProfileIdState]=useState(initialProfiles[0]?.id??defaultBrokerProfile.id);
  const [recurringByProfile,setRecurringByProfile]=useState<Record<string,RecurringFeeSettings>>(defaultRecurringMap);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        const parsed=JSON.parse(raw) as Partial<PersistedBrokerSettings>;
        if(parsed.schema!==1)return;
        const restored=normalizeBrokerProfiles(parsed.profiles);
        setProfiles(restored);
        const requested=String(parsed.activeProfileId??'');
        setActiveProfileIdState(restored.some(profile=>profile.id===requested)?requested:(restored[0]?.id??defaultBrokerProfile.id));
        const nextRecurring=defaultRecurringMap();
        if(parsed.recurringByProfile&&typeof parsed.recurringByProfile==='object'){
          for(const profile of restored){
            nextRecurring[profile.id]=normalizeRecurring(parsed.recurringByProfile[profile.id]);
          }
        }
        setRecurringByProfile(nextRecurring);
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedBrokerSettings={
      schema:1,
      activeProfileId,
      profiles,
      recurringByProfile,
    };
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,activeProfileId,profiles,recurringByProfile]);

  const activeProfile=useMemo(
    ()=>profiles.find(profile=>profile.id===activeProfileId)??profiles[0]??defaultBrokerProfile,
    [profiles,activeProfileId],
  );
  const recurring=useMemo(
    ()=>normalizeRecurring(recurringByProfile[activeProfile.id]),
    [recurringByProfile,activeProfile.id],
  );
  const recurringProfile=useMemo<BrokerProfile>(()=>{
    if(recurring.mode==='fixed'){
      return normalizeBrokerProfile({
        ...activeProfile,
        commissionRate:0,
        commissionDiscount:0,
        minimumCommissionOddLot:recurring.fixedFee,
      },activeProfile);
    }
    return normalizeBrokerProfile({
      ...activeProfile,
      commissionDiscount:recurring.discount,
      minimumCommissionOddLot:recurring.minimumFee,
    },activeProfile);
  },[activeProfile,recurring]);

  const value=useMemo<BrokerSettingsRuntimeValue>(()=>({
    hydrated,
    profiles,
    activeProfileId:activeProfile.id,
    activeProfile,
    recurring,
    recurringProfile,
    setActiveProfileId:id=>{
      if(profiles.some(profile=>profile.id===id))setActiveProfileIdState(id);
    },
    setProfile:profile=>setProfiles(current=>{
      const normalized=normalizeBrokerProfile(profile,activeProfile);
      const exists=current.some(item=>item.id===normalized.id);
      return exists?current.map(item=>item.id===normalized.id?normalized:item):[...current,normalized];
    }),
    setRecurring:(profileId,next)=>setRecurringByProfile(current=>({
      ...current,
      [profileId]:normalizeRecurring(next),
    })),
    resetProfile:profileId=>{
      const builtIn=builtInBrokerProfiles.find(profile=>profile.id===profileId);
      const fallback=builtIn??normalizeBrokerProfile({...defaultBrokerProfile,id:profileId},defaultBrokerProfile);
      setProfiles(current=>current.map(profile=>profile.id===profileId?{...fallback}:profile));
      setRecurringByProfile(current=>({...current,[profileId]:{...DEFAULT_RECURRING}}));
    },
  }),[hydrated,profiles,activeProfile,recurring,recurringProfile]);

  return <BrokerSettingsRuntimeContext.Provider value={value}>{children}</BrokerSettingsRuntimeContext.Provider>;
}

export function useBrokerSettingsRuntime(){
  const value=useContext(BrokerSettingsRuntimeContext);
  if(!value)throw new Error('useBrokerSettingsRuntime must be used inside BrokerSettingsRuntimeProvider');
  return value;
}
