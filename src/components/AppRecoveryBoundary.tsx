import {Component,type ReactNode,type ErrorInfo} from 'react';
import {Text,View,Pressable,StatusBar} from 'react-native';
/** Native controls remain usable even if a theme/editor provider fails. */
export class AppRecoveryBoundary extends Component<{children:ReactNode},{failed:boolean;attempt:number}>{
 state={failed:false,attempt:0};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('TFASSET_STARTUP_RENDER',error,info.componentStack);}
 render(){return this.state.failed?<View style={{flex:1,justifyContent:'center',padding:24,gap:16,backgroundColor:'#F8FAFC'}}>
  <StatusBar barStyle="dark-content"/><Text style={{fontSize:22,color:'#0F172A',fontWeight:'700'}}>畫面載入失敗</Text>
  <Text style={{fontSize:15,color:'#475569'}}>請重新載入畫面。帳務與版面設定仍保留，錯誤已記錄供檢查。</Text>
  <Pressable accessibilityRole="button" onPress={()=>this.setState(s=>({failed:false,attempt:s.attempt+1}))} style={{padding:16,backgroundColor:'#2563EB',borderRadius:10}}><Text style={{color:'#FFFFFF'}}>重新載入</Text></Pressable>
 </View>:<View key={this.state.attempt} style={{flex:1}}>{this.props.children}</View>;}
}
