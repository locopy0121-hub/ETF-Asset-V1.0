import {Component,type ErrorInfo,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {recordDiagnosticEvent} from '../diagnostics/DiagnosticRuntime';
import {colors,radius} from '../theme/tokens';

/** Protect JS child rendering after a mode switch; native fatal signals still need device logcat. */
export class PortfolioViewBoundary extends Component<{
  viewMode:'list'|'wall';onUseSafe:()=>void;children:ReactNode;
},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){
    recordDiagnosticEvent({level:'error',code:'PORTFOLIO_VIEW_RENDER',screen:'portfolio',
      message:'持股顯示切換後渲染異常：'+this.props.viewMode,
      detail:error.name+': '+error.message.slice(0,120)+' '+(info.componentStack??'').slice(0,300)});
    console.error('TF Asset portfolio view render',this.props.viewMode,error);
  }
  render(){
    if(!this.state.failed)return this.props.children;
    return <View style={styles.box}>
      <Text style={styles.title}>此顯示模組暫時無法載入</Text>
      <Text style={styles.hint}>錯誤已記錄，可改用獨立安全簡易清單；不會刪除持股與設定。</Text>
      <Pressable accessibilityRole="button" onPress={this.props.onUseSafe} style={styles.button}>
        <Text style={styles.buttonText}>改用安全簡易清單</Text>
      </Pressable>
    </View>;
  }
}
const styles=StyleSheet.create({
  box:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:16,gap:10,
    backgroundColor:colors.surfaceMuted},
  title:{fontSize:14,fontWeight:'900',color:colors.text},
  hint:{fontSize:11,lineHeight:17,color:colors.textSecondary},
  button:{alignSelf:'flex-start',minHeight:44,justifyContent:'center',borderRadius:radius.md,
    paddingHorizontal:14,backgroundColor:colors.primary},
  buttonText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
});
