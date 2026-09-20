import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

const iso=(d:Date)=>d.toISOString().slice(0,10);

export function CalendarDatePicker({visible,value,onChange,onClose}:{visible:boolean;value:string;onChange:(v:string)=>void;onClose:()=>void}){
  const [cursor,setCursor]=useState(()=>new Date(value+'T12:00:00'));
  const year=cursor.getFullYear(),month=cursor.getMonth();
  const first=new Date(year,month,1,12),days=new Date(year,month+1,0,12).getDate(),offset=first.getDay();
  const cells=Math.ceil((offset+days)/7)*7;
  const today=iso(new Date());
  const select=(day:number)=>{const d=new Date(year,month,day,12);onChange(iso(d));onClose();};
  const title=useMemo(()=>year+' 年 '+String(month+1).padStart(2,'0')+' 月',[year,month]);
  const shift=(delta:number)=>setCursor(new Date(year,month+delta,1,12));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.card}>
      <View style={s.top}><Pressable onPress={()=>shift(-1)} style={s.arrow}><Text style={s.arrowText}>‹</Text></Pressable><Text style={s.title}>{title}</Text><Pressable onPress={()=>shift(1)} style={s.arrow}><Text style={s.arrowText}>›</Text></Pressable></View>
      <View style={s.week}>{['日','一','二','三','四','五','六'].map(x=><Text key={x} style={s.weekText}>{x}</Text>)}</View>
      <View style={s.grid}>{Array.from({length:cells},(_,i)=>{const day=i-offset+1;const valid=day>=1&&day<=days;if(!valid)return <View key={i} style={s.day}/>;
        const valueIso=iso(new Date(year,month,day,12));const selected=valueIso===value;const isToday=valueIso===today;
        return <Pressable key={i} onPress={()=>select(day)} style={[s.day,selected&&s.selected,isToday&&!selected&&s.today]}><Text style={[s.dayText,selected&&s.selectedText]}>{day}</Text></Pressable>;
      })}</View>
      <View style={s.actions}><Pressable onPress={()=>{const d=new Date();setCursor(d);onChange(iso(d));onClose();}} style={s.todayBtn}><Text style={s.todayText}>今天</Text></Pressable><Pressable onPress={onClose} style={s.closeBtn}><Text style={s.closeText}>取消</Text></Pressable></View>
    </View></View>
  </Modal>;
}
const s=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(15,23,42,.42)',alignItems:'center',justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:420,backgroundColor:colors.surface,borderRadius:22,padding:spacing.lg,gap:12},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:18,fontWeight:'900',color:colors.text},
  arrow:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:20,backgroundColor:colors.surfaceMuted},arrowText:{fontSize:26,fontWeight:'900',color:colors.primary},
  week:{flexDirection:'row'},weekText:{width:'14.285%',textAlign:'center',fontSize:11,fontWeight:'800',color:colors.textSecondary},
  grid:{flexDirection:'row',flexWrap:'wrap'},day:{width:'14.285%',height:44,alignItems:'center',justifyContent:'center',borderRadius:12},dayText:{fontWeight:'800',color:colors.text},
  selected:{backgroundColor:colors.primary},selectedText:{color:'#fff'},today:{borderWidth:1,borderColor:colors.primary},
  actions:{flexDirection:'row',gap:10},todayBtn:{flex:1,padding:12,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center'},todayText:{color:'#fff',fontWeight:'900'},
  closeBtn:{flex:1,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,alignItems:'center'},closeText:{color:colors.textSecondary,fontWeight:'900'},
});
