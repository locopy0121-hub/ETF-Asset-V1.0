import {useEffect,useRef,type PropsWithChildren} from 'react';
import {View,Pressable,Text} from 'react-native';
import type {MainPageKey} from '../domain/pageRegistry';
import {usePageEditor} from '../editor/pageEditor';
import {FrameEditingProvider} from '../editor/FrameEditingContext';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {MaintenanceWorkbench} from '../maintenance/MaintenanceWorkbench';
import {WorkspaceSurface} from '../maintenance/WorkspaceSurface';
import {FrameCard} from './FrameCard';
import {useThemeRuntime} from '../theme/ThemeRuntime';

/** A modal owns its visible workbench; it cannot edit through the Activity beneath it. */
export function EditorSurface({pageKey,frameKey,title,children,visible=true,fill=true,inlineWorkbench=true}:PropsWithChildren<{
  pageKey:MainPageKey;frameKey:string;title:string;visible?:boolean;fill?:boolean;inlineWorkbench?:boolean;
}>){
  const editor=usePageEditor(pageKey),engineer=useMaintenance(),{palette}=useThemeRuntime();
  const active=engineer.session?.page===pageKey&&engineer.session.frameKey===frameKey;
  const latest=useRef(engineer);latest.current=engineer;
  useEffect(()=>{
    if(!visible&&active)engineer.cancel();
  },[visible,active]);
  useEffect(()=>()=>{const current=latest.current;if(current.session?.page===pageKey&&current.session.frameKey===frameKey)current.cancel();},[pageKey,frameKey]);
  const config=active&&engineer.session?engineer.session.draft:editor.config[frameKey];
  if(!config)return <>{children}</>;
  const frame={page:pageKey,frameKey,frameTitle:title,frameConfig:config,
    displayConfig:active&&engineer.session?engineer.session.draftDisplay:editor.displayConfig};
  return <View style={fill?{flex:1}:undefined}>
    {engineer.enabled?<View style={{flexDirection:'row',justifyContent:'flex-end',padding:6,backgroundColor:palette.surface}}>
      <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+title} disabled={Boolean(engineer.session&&!active)}
        onPress={()=>engineer.begin(pageKey,frameKey,title,config,undefined,editor.displayConfig)}>
        <Text style={{color:palette.primary,fontSize:12,fontWeight:'800'}}>🔧 編輯{title}</Text>
      </Pressable>
    </View>:null}
    <WorkspaceSurface fill={fill} active={Boolean(active&&engineer.enabled)} config={engineer.getWorkspace(pageKey,frameKey)}
      onBounds={bounds=>engineer.reportWorkspaceBounds(pageKey,frameKey,bounds)}>
      <FrameEditingProvider frame={frame}>
        <FrameCard title={title} showTitle={false} fill={fill} editorStyle={config} layout={config.layout} appearance={config.appearance}
          workActive={active} workHidden={!config.visible}>
          {config.visible||active?children:null}
        </FrameCard>
      </FrameEditingProvider>
    </WorkspaceSurface>
    {inlineWorkbench&&active?<MaintenanceWorkbench/>:null}
  </View>;
}
