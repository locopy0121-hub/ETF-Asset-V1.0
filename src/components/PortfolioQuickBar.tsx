import {StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import type {PortfolioPrimaryMode,PortfolioQuickMode} from '../domain/portfolioModeSwitch';
import {DEFAULT_QUICK_BAR_LAYOUT,normalizeQuickBarLayout,resolveQuickBarButton,
  type QuickBarKey,type QuickBarLayout} from '../domain/portfolioQuickBarLayout';

const FIRST={
  list:{label:'清單',glyph:'☷'},wall:{label:'行情牆',glyph:'▦'},
  quote:{label:'純行情',glyph:'≡'},compact:{label:'精簡',glyph:'▤'},
} as const satisfies Record<PortfolioPrimaryMode,{label:string;glyph:string}>;

/** Same functional handlers as before; order and geometry are display-only. */
export function PortfolioQuickBar({firstMode,activeMode,sortLabel,onCycleFirst,onSelect,onCycleSort,firstHint,
  layout:rawLayout,onEditSelect,editSelectedKey}:{
  firstMode:PortfolioPrimaryMode;
  activeMode:PortfolioQuickMode|'safe';
  sortLabel:string;
  onCycleFirst:()=>void;
  onSelect:(mode:'chart'|'advanced')=>void;
  onCycleSort:()=>void;
  firstHint?:string;
  layout?:QuickBarLayout|undefined;
  /** In settings preview, tapping edits appearance and never changes market modes. */
  onEditSelect?:(key:QuickBarKey)=>void;
  editSelectedKey?:QuickBarKey|null;
}){
  const first=FIRST[firstMode];
  const layout=rawLayout?normalizeQuickBarLayout(rawLayout):DEFAULT_QUICK_BAR_LAYOUT;
  const button=(key:QuickBarKey)=>{
    const shared={key,buttonKey:key,layout,
      selectedEdit:editSelectedKey===key,previewSelect:onEditSelect?()=>onEditSelect(key):undefined};
    switch(key){
      case 'first':return <QuickButton {...shared} label={first.label} glyph={first.glyph}
        selected={activeMode===firstMode} onPress={onCycleFirst}
        hint={firstHint??'循環切換清單、行情牆、純行情、精簡'}/>;
      case 'chart':return <QuickButton {...shared} label="圖表" glyph="⌁" selected={activeMode==='chart'}
        onPress={()=>onSelect('chart')}/>;
      case 'advanced':return <QuickButton {...shared} label="進階" glyph="▥" selected={activeMode==='advanced'}
        onPress={()=>onSelect('advanced')}/>;
      case 'sort':return <QuickButton {...shared} label="排序" glyph="↕" selected={false}
        onPress={onCycleSort} hint={'目前：'+sortLabel} status={sortLabel}/>;
    }
  };
  return <View accessibilityLabel="持股快捷切換" style={[styles.row,{
    columnGap:layout.columnGap,rowGap:layout.rowGap,
    paddingHorizontal:layout.paddingHorizontal,paddingVertical:layout.paddingVertical,
    marginHorizontal:layout.marginHorizontal,marginVertical:layout.marginVertical,
  }]}>
    {layout.order.map(button)}
  </View>;
}
function QuickButton({buttonKey,layout,label,glyph,selected,onPress,hint,status,previewSelect,selectedEdit}:{
  buttonKey:QuickBarKey;layout:QuickBarLayout;label:string;glyph:string;
  selected:boolean;onPress:()=>void;hint?:string;status?:string;
  previewSelect?:()=>void;selectedEdit?:boolean;
}){
  const v=resolveQuickBarButton(layout,buttonKey);
  const textColor=selected?v.selectedTextColor:v.labelColor;
  const glyphColor=selected?v.selectedTextColor:v.glyphColor;
  return <Pressable editorId={'native:PortfolioQuickBar:key:'+buttonKey}
    accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint={previewSelect?'設定'+label+'按鈕外觀':hint}
    accessibilityState={{selected:previewSelect?Boolean(selectedEdit):selected}}
    hitSlop={3} onPress={previewSelect??onPress}
    style={[styles.key,{
      ...(v.width===null?{flexGrow:1,flexBasis:0,minWidth:0}:{width:v.width,flexGrow:0}),
      ...(v.height!==null?{height:v.height}:{}),
      minHeight:v.minHeight,paddingHorizontal:v.paddingHorizontal,paddingVertical:v.paddingVertical,
      marginHorizontal:v.marginHorizontal,marginVertical:v.marginVertical,
      borderWidth:v.borderWidth,borderRadius:v.borderRadius,
      borderColor:selected?v.selectedBackgroundColor:v.borderColor,
      backgroundColor:selected?v.selectedBackgroundColor:v.backgroundColor,
      gap:v.contentGap,
    },selectedEdit&&styles.editSelected]}>
    <Text editorId={'native:PortfolioQuickBar:glyph:'+buttonKey} editorReadOnly={true}
      allowFontScaling={false} style={[styles.glyph,{fontSize:v.glyphSize,lineHeight:v.glyphLineHeight,color:glyphColor}]}>{glyph}</Text>
    <Text editorId={'native:PortfolioQuickBar:label:'+buttonKey} editorReadOnly={false}
      numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}
      style={[styles.label,{fontSize:v.labelSize,lineHeight:v.labelLineHeight,color:textColor}]}>{label}</Text>
    {status?<Text editorId={'native:PortfolioQuickBar:status:'+buttonKey} editorReadOnly={true}
      numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}
      style={[styles.status,{fontSize:v.statusSize,lineHeight:v.statusLineHeight,color:v.statusColor}]}>{status}</Text>:null}
  </Pressable>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch'},
  key:{alignItems:'center',justifyContent:'center'},
  glyph:{fontWeight:'700',textAlign:'center'},
  label:{fontWeight:'800',textAlign:'center'},
  status:{fontWeight:'700',textAlign:'center'},
  editSelected:{borderWidth:2,borderColor:'#08A5E9'},
});
