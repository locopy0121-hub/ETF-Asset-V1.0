import {Component,type ErrorInfo,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,radius,spacing} from '../theme/tokens';

type Props={children:ReactNode;onBack:()=>void;symbol:string};
type State={error:string|null};
/** Catches React render failures at the tapped holding's detail boundary.
 * A JS boundary cannot intercept Android native-process crashes: device logs remain required. */
export class HoldingDetailBoundary extends Component<Props,State>{
 state:State={error:null};
 static getDerivedStateFromError(error:Error):State{
  return {error:error instanceof Error?error.message:'未知畫面錯誤'};
 }
 componentDidCatch(error:Error,info:ErrorInfo){
  console.error('[HoldingDetail] render failure',this.props.symbol,error,info.componentStack);
 }
 render(){
  if(!this.state.error)return this.props.children;
  return <View style={styles.root}>
    <Text style={styles.title}>持股詳情暫時無法顯示</Text>
    <Text style={styles.message}>代號 {this.props.symbol}｜畫面發生錯誤；原始帳務與行情資料未被修改。</Text>
    <Text style={styles.reason}>錯誤：{this.state.error}</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" style={styles.button} onPress={()=>this.setState({error:null})}>
        <Text style={styles.buttonText}>重試詳情</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={this.props.onBack}>
        <Text style={styles.buttonText}>返回持股頁</Text>
      </Pressable>
    </View>
  </View>;
 }
}
const styles=StyleSheet.create({
 root:{flex:1,justifyContent:'center',padding:spacing.lg,gap:spacing.md,backgroundColor:colors.background},
 title:{fontSize:20,fontWeight:'900',color:colors.text},
 message:{fontSize:14,color:colors.textSecondary,lineHeight:23},
 reason:{fontSize:12,color:colors.loss},
 actions:{flexDirection:'row',gap:spacing.sm},
 button:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primary},
 buttonText:{color:'#FFFFFF',fontWeight:'800'}
});