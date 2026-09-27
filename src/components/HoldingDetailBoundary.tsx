import {Component,type ErrorInfo,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,radius,spacing} from '../theme/tokens';
import {recordDiagnosticEvent} from '../diagnostics/DiagnosticRuntime';

/** Isolate React rendering failures in holding details; native crashes still need logcat. */
type Props={symbol:string;onBack:()=>void;children:ReactNode};
type State={failed:boolean};
export class HoldingDetailBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){
    recordDiagnosticEvent({level:'error',code:'DETAIL_RENDER',screen:'holding-detail',message:'持股詳情元件渲染異常',detail:error.name+' '+(info.componentStack??'').slice(0,300)});
    console.error('TF Asset: holding detail render failure',this.props.symbol,error,info.componentStack);
  }
  render(){
    if(!this.state.failed)return this.props.children;
    return <View style={styles.screen}>
      <Text style={styles.title}>持股詳情暫時無法顯示</Text>
      <Text style={styles.detail}>已保留原始帳務資料。返回持股清單後仍可使用其他功能。</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="返回持股清單" onPress={this.props.onBack} style={styles.back}>
        <Text style={styles.backText}>返回持股清單</Text>
      </Pressable>
    </View>;
  }
}
const styles=StyleSheet.create({
  screen:{flex:1,alignItems:'center',justifyContent:'center',gap:spacing.md,padding:spacing.xl,backgroundColor:colors.background},
  title:{fontSize:18,fontWeight:'900',color:colors.text},
  detail:{fontSize:13,lineHeight:20,color:colors.textSecondary,textAlign:'center'},
  back:{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:20,borderRadius:radius.md,backgroundColor:colors.primary},
  backText:{fontSize:14,fontWeight:'800',color:'#FFFFFF'},
});
