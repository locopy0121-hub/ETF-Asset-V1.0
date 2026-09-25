import type {PropsWithChildren,ReactNode} from 'react';
import {Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View,type TextStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors,spacing} from '../theme/tokens';
import type {MainPageKey} from '../domain/pageRegistry';
import {usePageEditor} from '../editor/pageEditor';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from '../maintenance/inspectionModel';
import {WorkspaceSurface} from '../maintenance/WorkspaceSurface';
import {colorWithAlpha,mixFrameColors,normalizeFrameEffects,sampleFrameGradient} from '../maintenance/frameEffects';
import {linkedColor} from '../maintenance/workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {resolvePageTitle} from '../settings/settingsControlBehavior';
import {THEME_BACKGROUNDS,useThemeRuntime} from '../theme/ThemeRuntime';

type Props=PropsWithChildren<{title:string;pageKey?:MainPageKey;subtitle?:string;actions?:ReactNode}>;

/** Real page-header child, not an extra simulated card. Its text override is local to this page. */
function HeaderText({id,value,style,frame}:{id:'brand'|'title'|'subtitle';value:string;style:TextStyle;frame:FrameMaintenanceContext}){
  const target:InspectedTarget={
    id:'header:'+id,kind:'text',label:id==='brand'?'品牌名稱':id==='title'?'頁面主標題':'頁面副標題',
    page:frame.page,frameKey:'page-header',frameTitle:frame.frameTitle,
    properties:[{name:'原始文字',value,readOnly:true},{name:'作用範圍',value:'本頁表頭外觀'}],
    base:{...TARGET_APPEARANCE,fontSize:style.fontSize??13,fontWeight:style.fontWeight??'normal',
      textColor:typeof style.color==='string'?style.color:'#0F172A',
      backgroundColor:'#FFFFFF',backgroundOpacity:0,padding:0,borderWidth:0,borderRadius:0,
      labelText:'',align:'left'},
  };
  return <InspectableTarget target={target} frame={frame}>{(appearance,customized,override)=>
    <Text style={[style,customized&&{
      ...(override.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
      ...(override.textColor!==undefined||override.textProfitColor!==undefined?{color:appearance.textColor}:{}),
      ...(override.fontWeight!==undefined?{fontWeight:appearance.fontWeight}:{}),
      ...(override.fontStyle!==undefined?{fontStyle:appearance.fontStyle}:{}),
      ...(override.fontFamily!==undefined&&appearance.fontFamily!=='system'?{fontFamily:appearance.fontFamily}:{}),
      ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
      ...(override.lineHeight!==undefined&&appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}),
      ...(override.textDecorationLine!==undefined?{textDecorationLine:appearance.textDecorationLine}:{}),
      ...(override.align!==undefined?{textAlign:appearance.align}:{}),
      ...(override.backgroundColor!==undefined||override.backgroundProfitColor!==undefined||override.backgroundOpacity!==undefined?
        {backgroundColor:colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)}:{}),
    }]}>{customized&&appearance.labelText?appearance.labelText:value}</Text>
  }</InspectableTarget>;
}

export function PageShell({title,pageKey,subtitle,actions,children}:Props){
  const theme=useThemeRuntime();
  const settings=useSettingsRuntime();
  const editor=usePageEditor(pageKey??'home');
  const engineer=useMaintenance();
  const displayedTitle=pageKey?resolvePageTitle(pageKey,title,settings.prefs.pageTitles):title;
  const saved=pageKey?editor.config['page-header']:undefined;
  const active=Boolean(pageKey&&engineer.session?.page===pageKey&&engineer.session.frameKey==='page-header');
  const headerConfig=active?engineer.session!.draft:saved;
  const fx=normalizeFrameEffects(headerConfig?.effects);
  const background=linkedColor(headerConfig?.backgroundColor??theme.palette.surface,
    headerConfig?.backgroundProfitColor,'neutral',settings.prefs.display);
  const end=linkedColor(fx.gradientEndColor,fx.gradientEndProfitColor,'neutral',settings.prefs.display);
  const middle=linkedColor(fx.gradientMidColor,fx.gradientMidProfitColor,'neutral',settings.prefs.display);
  const gradientOn=Boolean(headerConfig&&fx.backgroundMode==='gradient');
  const imageUri=fx.imageSource==='builtIn'?THEME_BACKGROUNDS[fx.imageIndex]:fx.imageUri;
  const imageOn=Boolean(headerConfig&&fx.backgroundMode==='image'&&imageUri);
  const mask=linkedColor(fx.maskColor,fx.maskProfitColor,'neutral',settings.prefs.display);
  const gradient=Array.from({length:16},(_,i)=>fx.gradientMidEnabled?
    sampleFrameGradient(background,middle,end,i/15,fx.gradientMidStop,true):mixFrameColors(background,end,i/15));
  const headerFrame:FrameMaintenanceContext={
    page:pageKey??'home',frameKey:'page-header',frameTitle:'頁面頂部表頭',
    frameConfig:headerConfig??editor.config['page-header']!,displayConfig:editor.displayConfig,
  };
  const editHeader=()=>{
    if(!pageKey||!saved)return;
    if(engineer.session&&(engineer.session.page!==pageKey||engineer.session.frameKey!=='page-header')){
      // Never silently discard another frame's pending changes.
      return;
    }
    engineer.begin(pageKey,'page-header','頁面頂部表頭',saved,undefined,editor.displayConfig);
  };
  const titleStyle:TextStyle={...styles.title,color:headerConfig?.titleColor??theme.palette.text,
    fontSize:headerConfig?.titleFontSize??28,textAlign:headerConfig?.titleAlign??'left'};
  const header=(headerConfig?.visible===false&&!active)?null:
    <View style={[styles.header,{
      backgroundColor:gradientOn?'transparent':colorWithAlpha(background,headerConfig?.backgroundOpacity??1),
      borderBottomColor:headerConfig?.borderColor??theme.palette.border,
      ...(headerConfig?{borderWidth:headerConfig.borderWidth,borderRadius:headerConfig.borderRadius}:{}),
      ...(headerConfig?.width!==undefined?{width:headerConfig.width}:{}),
      ...(headerConfig?.height!==undefined?{height:headerConfig.height}:{}),
      ...(headerConfig?.minHeight!==undefined?{minHeight:headerConfig.minHeight}:{}),
      ...(headerConfig?.padding!==undefined?{padding:headerConfig.padding}:{}),
      ...(fx.contentGap>=0?{gap:fx.contentGap}:{}),
    },active&&headerConfig?.visible===false?{opacity:.5}:{}]}>
      {gradientOn?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden',flexDirection:fx.gradientDirection==='vertical'?'column':'row'}]}>
        {gradient.map((c,i)=><View key={i} style={{flex:1,backgroundColor:colorWithAlpha(c,headerConfig?.backgroundOpacity??1)}}/>)}
      </View>:null}
      {imageOn?<Image pointerEvents="none" source={{uri:imageUri!}} resizeMode={fx.imageFit}
        style={[StyleSheet.absoluteFill,{opacity:fx.imageOpacity}]}/>:null}
      {(gradientOn||imageOn)&&fx.maskOpacity>0?<View pointerEvents="none"
        style={[StyleSheet.absoluteFill,{backgroundColor:colorWithAlpha(mask,fx.maskOpacity)}]}/>:null}
      {active?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{
        borderWidth:2,borderStyle:'dashed',borderColor:theme.palette.primary,
        borderRadius:headerConfig?.borderRadius??0,
      }]}/>:null}
      <View style={styles.titleWrap}>
        {pageKey?<HeaderText id="brand" value="TF Asset" style={{...styles.brand,color:theme.palette.primary}} frame={headerFrame}/>:
          <Text style={[styles.brand,{color:theme.palette.primary}]}>TF Asset</Text>}
        {pageKey?<HeaderText id="title" value={displayedTitle} style={titleStyle} frame={headerFrame}/>:
          <Text style={titleStyle}>{displayedTitle}</Text>}
        {subtitle?(pageKey?<HeaderText id="subtitle" value={subtitle}
          style={{...styles.subtitle,color:theme.palette.textSecondary}} frame={headerFrame}/>:
          <Text style={[styles.subtitle,{color:theme.palette.textSecondary}]}>{subtitle}</Text>):null}
      </View>
      {actions?<View style={styles.actions}>{actions}</View>:null}
      {pageKey&&engineer.enabled?<Pressable accessibilityRole="button" accessibilityLabel="編輯頁面最上方表頭"
        onPress={editHeader} style={[styles.wrench,{borderColor:theme.palette.primary}]}>
        <Text style={{fontSize:16}}>🔧</Text>
      </Pressable>:null}
    </View>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:'transparent'}]} edges={['top']}>
    {pageKey?<WorkspaceSurface config={engineer.getWorkspace(pageKey,'page-header')}
      active={Boolean(active&&engineer.enabled)}
      onBounds={bounds=>engineer.reportWorkspaceBounds(pageKey,'page-header',bounds)}>
      {header}
    </WorkspaceSurface>:header}
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},
  header:{paddingHorizontal:spacing.lg,paddingVertical:spacing.md,
    backgroundColor:colors.surface,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,
    flexDirection:'row',alignItems:'center',position:'relative'},
  titleWrap:{flex:1,minWidth:0},brand:{color:colors.primary,fontSize:13,fontWeight:'800',letterSpacing:.4},
  title:{color:colors.text,fontSize:28,fontWeight:'800',marginTop:2},
  subtitle:{color:colors.textSecondary,fontSize:13,marginTop:4},
  actions:{marginLeft:spacing.md,flexDirection:'row',gap:spacing.sm},
  wrench:{position:'absolute',top:3,right:3,borderWidth:1,borderRadius:16,
    backgroundColor:colors.surface,justifyContent:'center',alignItems:'center',width:29,height:29},
  keyboard:{flex:1},scroll:{flex:1},content:{padding:spacing.lg,paddingBottom:110,gap:spacing.lg},
});
