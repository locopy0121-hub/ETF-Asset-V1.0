import {Pressable,StyleSheet,Text,View} from 'react-native';
import {type PortfolioModeChoice} from '../domain/portfolioModeSwitch';
import {colors,radius} from '../theme/tokens';

type Item=Readonly<{key:PortfolioModeChoice;label:string;description:string}>;
/** Dedicated, non-animated native Pressable selector. Never reuses the old segmented control. */
export function PortfolioModeSwitcher({items,value,onChange}:{
  items:readonly Item[];value:PortfolioModeChoice;onChange:(next:PortfolioModeChoice)=>void;
}){
  return <View style={styles.group} accessibilityLabel="持股顯示切換">
    {items.map(item=>{
      const active=value===item.key;
      const safe=item.key==='safe';
      return <Pressable key={item.key} accessibilityRole="button"
        accessibilityLabel={item.label} accessibilityState={{selected:active}}
        onPress={()=>{if(!active)onChange(item.key);}}
        style={[styles.card,safe&&styles.safe,active&&styles.active]}>
        <Text style={[styles.title,active&&styles.activeText]}>{item.label}</Text>
        <Text style={[styles.subtitle,active&&styles.activeSubtitle]}>{item.description}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles=StyleSheet.create({
  group:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingVertical:4},
  card:{flexBasis:'45%',flexGrow:1,minHeight:60,paddingHorizontal:12,paddingVertical:10,
    borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,
    justifyContent:'center',gap:4},
  safe:{flexBasis:'100%',minHeight:48,backgroundColor:colors.surfaceMuted},
  active:{backgroundColor:colors.primary,borderColor:colors.primary},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:10,lineHeight:15,color:colors.textSecondary},
  activeText:{color:'#FFFFFF'},activeSubtitle:{color:'#FFFFFF'},
});
