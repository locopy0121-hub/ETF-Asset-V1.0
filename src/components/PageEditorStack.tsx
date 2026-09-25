import { cloneElement, type ReactElement } from 'react';
import { Pressable,Text,View } from 'react-native';

import type { FrameCardProps } from './FrameCard';
import type { MainPageKey } from '../domain/pageRegistry';
import { usePageEditor } from '../editor/pageEditor';
import {InstalledFrameComponents} from '../maintenance/MaintenanceWorkbench';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';

type EditorFrameItem={key:string;element:ReactElement<FrameCardProps>};

export function PageEditorStack({pageKey,frames}:{pageKey:MainPageKey;frames:readonly EditorFrameItem[]}){
  const {config}=usePageEditor(pageKey);
  const engineer=useMaintenance();
  const session=engineer.session?.page===pageKey?engineer.session:null;
  const ordered=[...frames]
    .filter(item => config[item.key]?.visible !== false)
    .sort((a,b)=>(session&&session.frameKey===a.key?session.draft.order:config[a.key]?.order??0)-(session&&session.frameKey===b.key?session.draft.order:config[b.key]?.order??0));

  return <View style={{gap:12}}>{ordered.map(item=>{
    const active=session?.frameKey===item.key;
    const frameConfig=active&&session?session.draft:config[item.key];
    const instances=active&&session?session.draftInstances:engineer.getInstances(pageKey,item.key);
    const open=(instanceId?:string)=>{
      const source=config[item.key];if(!source)return;
      engineer.begin(pageKey,item.key,item.element.props.title,source,instanceId);
    };
    const originalAction=item.element.props.action;
    return cloneElement(item.element,{
      key:item.key,
      layout:frameConfig?.layout??'standard',
      appearance:frameConfig?.appearance??'theme',
      ...(frameConfig?{editorStyle:frameConfig}:{}),
      workActive:active&&session?.scope==='frame',
      workHidden:active&&session?.scope==='frame'&&!session.draft.visible,
      action:<View style={{flexDirection:'row',gap:6,alignItems:'center'}}>
        {originalAction}
        {engineer.enabled?<Pressable accessibilityRole="button" accessibilityLabel={'呼叫'+item.element.props.title+'維護工程師'} onPress={()=>open()} style={{minWidth:36,minHeight:36,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:18,borderColor:'#6495D1'}}>
          <Text style={{fontSize:17}}>🔧</Text>
        </Pressable>:null}
      </View>,
      children:<>{item.element.props.children}
        {instances.length?<InstalledFrameComponents
          instances={instances}
          enabled={engineer.enabled}
          activeId={active&&session?.scope==='instance'?session.instanceId:undefined}
          onWrench={id=>open(id)}
        />:null}
      </>,
    });
  })}</View>;
}
