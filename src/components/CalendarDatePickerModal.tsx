import {EditorSurface} from './EditorSurface';
import {useEffect,useState} from 'react';
import {Modal,StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';

import {colors,radius} from '../theme/tokens';

type CalendarDatePickerModalProps=Readonly<{
  visible:boolean;
  value:string;
  title?:string;
  allowClear?:boolean;
  onChange:(value:string)=>void;
  onClose:()=>void;
}>;

function parseIsoDate(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(match){
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    if(year>0&&month>=1&&month<=12&&day>=1&&day<=new Date(year,month,0).getDate())return {year,month,day};
  }
  const now=new Date();
  return {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate()};
}

function formatIsoDate(year:number,month:number,day:number){
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export function CalendarDatePickerModal({
  visible,value,title='選擇日期',allowClear=false,onChange,onClose,
}:CalendarDatePickerModalProps){
  const initial=parseIsoDate(value);
  const [viewYear,setViewYear]=useState(initial.year);
  const [viewMonth,setViewMonth]=useState(initial.month);

  useEffect(()=>{
    if(!visible)return;
    const next=parseIsoDate(value);
    setViewYear(next.year);
    setViewMonth(next.month);
  },[visible,value]);

  const selected=value?parseIsoDate(value):null;
  const firstWeekday=new Date(viewYear,viewMonth-1,1).getDay();
  const monthDays=new Date(viewYear,viewMonth,0).getDate();
  const cells:Array<number|null>=[
    ...Array.from({length:firstWeekday},()=>null),
    ...Array.from({length:monthDays},(_,index)=>index+1),
  ];
  while(cells.length%7!==0)cells.push(null);

  const changeMonth=(delta:number)=>{
    const total=viewYear*12+(viewMonth-1)+delta;
    setViewYear(Math.floor(total/12));
    setViewMonth(((total%12)+12)%12+1);
  };
  const choose=(year:number,month:number,day:number)=>{
    onChange(formatIsoDate(year,month,day));
    onClose();
  };
  const chooseToday=()=>{
    const now=new Date();
    choose(now.getFullYear(),now.getMonth()+1,now.getDate());
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><EditorSurface pageKey="dividend" frameKey="dividend-date-modal" title="股息日期選擇" visible={visible}>
    <View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text editorId="native:CalendarDatePickerModal:title:1" editorReadOnly={false} style={styles.title}>{title}</Text>
          <Text editorId="native:CalendarDatePickerModal:value:2" editorReadOnly={true} style={styles.value}>{value||'尚未設定'}</Text>
        </View>
        <Pressable editorId="native:CalendarDatePickerModal:close:3" accessibilityRole="button" accessibilityLabel="關閉日期選擇" onPress={onClose} style={styles.close}><Text editorId="native:CalendarDatePickerModal:closeText:4" editorReadOnly={false} style={styles.closeText}>×</Text></Pressable>
      </View>

      <View style={styles.calendarHeader}>
        <Pressable editorId="native:CalendarDatePickerModal:navButton:5" accessibilityLabel="前一年" style={styles.navButton} onPress={()=>setViewYear(year=>year-1)}><Text editorId="native:CalendarDatePickerModal:navText:6" editorReadOnly={false} style={styles.navText}>‹ 年</Text></Pressable>
        <Text editorId="native:CalendarDatePickerModal:calendarTitle:7" editorReadOnly={true} style={styles.calendarTitle}>{viewYear} 年</Text>
        <Pressable editorId="native:CalendarDatePickerModal:navButton:8" accessibilityLabel="後一年" style={styles.navButton} onPress={()=>setViewYear(year=>year+1)}><Text editorId="native:CalendarDatePickerModal:navText:9" editorReadOnly={false} style={styles.navText}>年 ›</Text></Pressable>
      </View>
      <View style={styles.calendarHeader}>
        <Pressable editorId="native:CalendarDatePickerModal:navButton:10" accessibilityLabel="上個月" style={styles.navButton} onPress={()=>changeMonth(-1)}><Text editorId="native:CalendarDatePickerModal:navText:11" editorReadOnly={false} style={styles.navText}>‹ 月</Text></Pressable>
        <Text editorId="native:CalendarDatePickerModal:calendarTitle:12" editorReadOnly={true} style={styles.calendarTitle}>{viewMonth} 月</Text>
        <Pressable editorId="native:CalendarDatePickerModal:navButton:13" accessibilityLabel="下個月" style={styles.navButton} onPress={()=>changeMonth(1)}><Text editorId="native:CalendarDatePickerModal:navText:14" editorReadOnly={false} style={styles.navText}>月 ›</Text></Pressable>
      </View>

      <View style={styles.weekRow}>
        {['日','一','二','三','四','五','六'].map(day=><Text editorId="native:CalendarDatePickerModal:weekLabel:15" editorReadOnly={true} key={day} style={styles.weekLabel}>{day}</Text>)}
      </View>
      <View style={styles.grid}>
        {cells.map((day,index)=>{
          const active=day!=null&&selected?.year===viewYear&&selected.month===viewMonth&&selected.day===day;
          return <View key={`${viewYear}-${viewMonth}-${index}`} style={styles.dayCell}>
            {day==null?null:<Pressable editorId="native:CalendarDatePickerModal:dayButton:16"
              accessibilityRole="button"
              accessibilityLabel={`${viewYear}年${viewMonth}月${day}日`}
              onPress={()=>choose(viewYear,viewMonth,day)}
              style={[styles.dayButton,active&&styles.dayButtonActive]}
            ><Text editorId="native:CalendarDatePickerModal:dayText:17" editorReadOnly={true} style={[styles.dayText,active&&styles.dayTextActive]}>{day}</Text></Pressable>}
          </View>;
        })}
      </View>

      <View style={styles.actions}>
        <Pressable editorId="native:CalendarDatePickerModal:secondary:18" style={styles.secondary} onPress={chooseToday}><Text editorId="native:CalendarDatePickerModal:secondaryText:19" editorReadOnly={false} style={styles.secondaryText}>今天</Text></Pressable>
        {allowClear?<Pressable editorId="native:CalendarDatePickerModal:secondary:20" style={styles.secondary} onPress={()=>{onChange('');onClose();}}><Text editorId="native:CalendarDatePickerModal:secondaryText:21" editorReadOnly={false} style={styles.secondaryText}>清除日期</Text></Pressable>:null}
        <Pressable editorId="native:CalendarDatePickerModal:primary:22" style={styles.primary} onPress={onClose}><Text editorId="native:CalendarDatePickerModal:primaryText:23" editorReadOnly={false} style={styles.primaryText}>取消</Text></Pressable>
      </View>
    </View></View>
  </EditorSurface></Modal>;
}

const styles=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(12,18,27,.45)',alignItems:'center',justifyContent:'center',padding:24},
  modal:{width:'100%',maxWidth:420,backgroundColor:colors.surface,borderRadius:22,padding:20,gap:14},
  header:{flexDirection:'row',alignItems:'flex-start',gap:12},
  title:{fontSize:18,fontWeight:'900',color:colors.text},
  value:{fontSize:12,fontWeight:'800',color:colors.primary,marginTop:4},
  close:{width:34,height:34,borderRadius:17,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  closeText:{fontSize:22,lineHeight:24,fontWeight:'700',color:colors.textSecondary},
  calendarHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  navButton:{minWidth:74,paddingHorizontal:10,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,alignItems:'center'},
  navText:{fontSize:11,fontWeight:'900',color:colors.primary},
  calendarTitle:{flex:1,textAlign:'center',fontSize:15,fontWeight:'900',color:colors.text},
  weekRow:{flexDirection:'row'},
  weekLabel:{width:'14.2857%',textAlign:'center',fontSize:10,fontWeight:'900',color:colors.textSecondary,paddingVertical:4},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  dayCell:{width:'14.2857%',aspectRatio:1,alignItems:'center',justifyContent:'center'},
  dayButton:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  dayButtonActive:{backgroundColor:colors.primary},
  dayText:{fontSize:11,fontWeight:'800',color:colors.text},
  dayTextActive:{color:'#FFF'},
  actions:{flexDirection:'row',gap:8,justifyContent:'flex-end',flexWrap:'wrap'},
  secondary:{paddingHorizontal:14,paddingVertical:10,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  secondaryText:{fontSize:11,fontWeight:'900',color:colors.primary},
  primary:{paddingHorizontal:14,paddingVertical:10,borderRadius:radius.md,backgroundColor:colors.primary},
  primaryText:{fontSize:11,fontWeight:'900',color:'#FFF'},
});
