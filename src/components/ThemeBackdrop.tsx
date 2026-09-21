import type {PropsWithChildren} from 'react';
import {ImageBackground,StyleSheet,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';

export function ThemeBackdrop({children}:PropsWithChildren){
  const theme=useThemeRuntime();
  const p=theme.state.palette;
  const bg=theme.state.background;
  const resizeMode=bg.fit==='fit-height'?'contain':bg.fit==='fit-width'?'cover':'stretch';
  return <View style={[styles.root,{backgroundColor:p.background}]}>
    {theme.backgroundUri?<ImageBackground
      source={{uri:theme.backgroundUri}}
      blurRadius={bg.blurRadius}
      resizeMode={resizeMode}
      imageStyle={{opacity:bg.opacity}}
      style={StyleSheet.absoluteFill}
    />:null}
    {bg.maskOpacity>0?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#000000',opacity:bg.maskOpacity}]}/>:null}
    <View style={styles.content}>{children}</View>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1},content:{flex:1}});
