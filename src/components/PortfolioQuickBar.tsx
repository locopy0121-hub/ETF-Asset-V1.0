import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {PortfolioPrimaryMode,PortfolioQuickMode} from '../domain/portfolioModeSwitch';
import {colors,radius} from '../theme/tokens';

const FIRST={
  list:{label:'清單',glyph:'☷'},wall:{label:'行情牆',glyph:'▦'},
  quote:{label:'純行情',glyph:'≡'},compact:{label:'精簡',glyph:'▤'},
} as const satisfies Record<PortfolioPrimaryMode,{label:string;glyph:string}>;

/** Four native buttons, no animation, separate editable A ID. */
export function PortfolioQuickBar({firstMode,activeMode,sortLabel,onCycleFirst,onSelect,onCycleSort,firstHint}:{
  firstMode:PortfolioPrimaryMode;
  activeMode:PortfolioQuickMode|'safe';
  sortLabel:string;
  onCycleFirst:()=>void;
  onSelect:(mode:'chart'|'advanced')=>void;
  onCycleSort:()=>void;
  firstHint?:string;
}){
  const first=FIRST[firstMode];
  return <View style={styles.row} accessibilityLabel="持股快捷切換">
    <QuickButton label={first.label} glyph={first.glyph} selected={activeMode===firstMode}
      onPress={onCycleFirst} hint={firstHint??'循環切換清單、行情牆、純行情、精簡'}/>
    <QuickButton label="圖表" glyph="⌁" selected={activeMode==='chart'}
      onPress={()=>onSelect('chart')}/>
    <QuickButton label="進階" glyph="▥" selected={activeMode==='advanced'}
      onPress={()=>onSelect('advanced')}/>
    <QuickButton label="排序" glyph="↕" selected={false}
      onPress={onCycleSort} hint={'目前：'+sortLabel} status={sortLabel}/>
  </View>;
}
function QuickButton({label,glyph,selected,onPress,hint,status}:{
  label:string;glyph:string;selected:boolean;onPress:()=>void;hint?:string;status?:string;
}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint={hint} accessibilityState={{selected}}
    hitSlop={3} onPress={onPress} style={[styles.key,selected&&styles.selected]}>
    <Text allowFontScaling={false} style={[styles.glyph,selected&&styles.selectedText]}>{glyph}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}
      style={[styles.label,selected&&styles.selectedText]}>{label}</Text>
    {status?<Text numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}
      style={styles.status}>{status}</Text>:null}
  </Pressable>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',gap:6,paddingVertical:4,alignItems:'stretch'},
  key:{flex:1,minWidth:0,minHeight:76,borderWidth:1,borderColor:colors.border,
    borderRadius:radius.md,backgroundColor:colors.surfaceMuted,
    paddingHorizontal:3,paddingVertical:8,alignItems:'center',justifyContent:'center',gap:3},
  selected:{backgroundColor:colors.primary,borderColor:colors.primary},
  glyph:{fontSize:26,lineHeight:31,fontWeight:'700',color:colors.primary,textAlign:'center'},
  label:{fontSize:12,fontWeight:'800',color:colors.text,textAlign:'center'},
  selectedText:{color:'#FFFFFF'},
  status:{fontSize:9,lineHeight:12,fontWeight:'700',color:colors.textSecondary,textAlign:'center'},
});
