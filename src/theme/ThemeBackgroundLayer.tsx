import {ImageBackground,StyleSheet,View} from 'react-native';
import {useThemeRuntime} from './ThemeRuntime';

export function ThemeBackgroundLayer(){
  const theme=useThemeRuntime();
  const resizeMode=theme.prefs.backgroundMode==='fill'?'cover':'contain';
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <ImageBackground
      source={{uri:theme.backgroundUri}}
      resizeMode={resizeMode}
      blurRadius={theme.prefs.blurRadius}
      style={StyleSheet.absoluteFill}
      imageStyle={{opacity:theme.prefs.backgroundOpacity}}
    />
    <View style={[StyleSheet.absoluteFill,{backgroundColor:theme.prefs.maskColor,opacity:theme.prefs.maskOpacity}]}/>
  </View>;
}
