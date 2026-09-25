import {Children,cloneElement,isValidElement,type ComponentProps,type ReactElement,type ReactNode} from 'react';
import { Pressable,StyleSheet,Text,type TextStyle,View } from 'react-native';

import type { FrameCardProps } from './FrameCard';
import { MetricTile } from './MetricTile';
import { HoldingQuoteCollection } from './HoldingQuoteCollection';
import { SegmentedControl } from './SegmentedControl';
import {AiQuestionBox} from './AiQuestionBox';
import type { MainPageKey } from '../domain/pageRegistry';
import { usePageEditor } from '../editor/pageEditor';
import {InstalledFrameComponents} from '../maintenance/MaintenanceWorkbench';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from '../maintenance/inspectionModel';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {WorkspaceSurface} from '../maintenance/WorkspaceSurface';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {spacing} from '../theme/tokens';
import {colorWithAlpha} from '../maintenance/frameEffects';

type EditorFrameItem={key:string;element:ReactElement<FrameCardProps>};

function decorateContent(node:ReactNode,frame:FrameMaintenanceContext,path='root'):ReactNode {
  return Children.map(node,(child,index)=>{
    if(!isValidElement(child))return child;
    const part=child.key!==null?String(child.key):String(index);
    const nodeId=(path+'/'+part).slice(0,120);
    if(child.type===MetricTile){
      const props=child.props as ComponentProps<typeof MetricTile>;
      const target:InspectedTarget={
        id:'metric:'+props.label,kind:'metric',label:props.label,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
        profitTone:props.tone==='gain'?'gain':props.tone==='loss'?'loss':'neutral',
        properties:[
          {name:'欄位名稱',value:props.label,readOnly:true},{name:'即時數值（帳務唯讀）',value:props.value,readOnly:true},
          {name:'原說明',value:props.caption??'無',readOnly:true},{name:'損益狀態',value:props.tone??'default',readOnly:true},
          {name:'標題字號',value:'11 px'},{name:'數值字號',value:'17 px'},
        ],
        base:{...TARGET_APPEARANCE,fontSize:17,labelFontSize:11,captionFontSize:10,fontWeight:'900',labelFontWeight:'700',captionFontWeight:'normal',
          backgroundColor:'#F4ECFF',textColor:props.tone==='gain'?'#EF4444':props.tone==='loss'?'#10B981':'#0F172A',
          labelColor:'#64748B',borderWidth:0,borderRadius:12,padding:spacing.md,
        },
      };
      return <InspectableTarget key={child.key??target.id} target={target} frame={frame} flex>
        {(_appearance,customized,override)=><MetricTile {...props} {...(customized?{editorStyle:override}:{})}/>}
      </InspectableTarget>;
    }
    if(child.type===AiQuestionBox){
      const props=child.props as ComponentProps<typeof AiQuestionBox>;
      return cloneElement(child as ReactElement<ComponentProps<typeof AiQuestionBox>>,{...props,maintenance:frame});
    }
    if(child.type===HoldingQuoteCollection){
      const props=child.props as ComponentProps<typeof HoldingQuoteCollection>;
      return cloneElement(child as ReactElement<ComponentProps<typeof HoldingQuoteCollection>>,{
        ...props,maintenance:frame,
      });
    }
    if(child.type===SegmentedControl){
      const props=child.props as ComponentProps<typeof SegmentedControl>;
      const choices=props.items.map(item=>item.label).join('／');
      const target:InspectedTarget={
        id:'control:'+nodeId,kind:'control',label:'操作模式',page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
        properties:[{name:'目前模式',value:String(props.value)},{name:'可選項目',value:choices,readOnly:true}],
        base:{...TARGET_APPEARANCE,backgroundColor:'#F6EAFF',padding:0,borderWidth:0},
      };
      return <InspectableTarget key={child.key??nodeId} target={target} frame={frame}>{()=>child}</InspectableTarget>;
    }
    if(child.type===Text){
      const props=child.props as ComponentProps<typeof Text>;
      const content=typeof props.children==='string'||typeof props.children==='number'?String(props.children):null;
      if(content&&content.trim().length>=2){
        const raw=StyleSheet.flatten(props.style) as TextStyle|undefined;
        const color=typeof raw?.color==='string'&&/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:'#0F172A';
        const bg=typeof raw?.backgroundColor==='string'&&/^#[0-9a-f]{6}$/i.test(raw.backgroundColor)?raw.backgroundColor:'#FFFFFF';
        const size=typeof raw?.fontSize==='number'?raw.fontSize:13;
        const isPrefix=content.trim()==='NT$'&&frame.page==='home'&&frame.frameKey==='asset-dashboard';
        const isDataValue=/NT\$\s*[-+]?\s*[\d,]+(?:\.\d+)?|^[+-]?[\d,]+(?:\.\d+)?%?$/.test(content)
          ||!!raw?.fontVariant?.includes('tabular-nums');
        const target:InspectedTarget={
          id:'text:'+nodeId,kind:isDataValue?'value':'text',label:content.slice(0,24),page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
          properties:[{name:'原畫面文字',value:content,readOnly:true},{name:'原字號',value:size+' px',readOnly:true},
            {name:'原文字顏色',value:color,readOnly:true},
            ...(isDataValue?[{name:'資料保護',value:'原始數值不可由文字工具覆寫',readOnly:true}]:[])],
          base:{...TARGET_APPEARANCE,fontSize:size,textColor:color,backgroundColor:bg,
            align:raw?.textAlign==='center'||raw?.textAlign==='right'?raw.textAlign:'left',
            fontWeight:raw?.fontWeight??'normal',fontStyle:raw?.fontStyle??'normal',
            fontFamily:['sans-serif','sans-serif-condensed','serif','monospace'].includes(raw?.fontFamily??'')?
              raw!.fontFamily as 'sans-serif'|'sans-serif-condensed'|'serif'|'monospace':'system',
            textDecorationLine:raw?.textDecorationLine??'none',
            letterSpacing:raw?.letterSpacing??0,lineHeight:raw?.lineHeight??0,
            borderWidth:typeof raw?.borderWidth==='number'?raw.borderWidth:0,
            padding:typeof raw?.padding==='number'?raw.padding:0,borderRadius:typeof raw?.borderRadius==='number'?raw.borderRadius:0},
        };
        const actualTarget:InspectedTarget=isPrefix?{...target,id:'prefix:'+nodeId,kind:'prefix',
          label:'NT$ 貨幣前綴',properties:[...target.properties,{name:'元件類型',value:'獨立貨幣前綴；金額仍為帳務唯讀',readOnly:true}],
          base:{...target.base,prefixText:content,prefixGap:8}}:target;
        return <InspectableTarget key={child.key??nodeId} target={actualTarget} frame={frame}>
          {(appearance,customized,override)=>cloneElement(child as ReactElement<ComponentProps<typeof Text>>,{
            ...props,children:customized&&!isDataValue?(isPrefix?
              (override.prefixText!==undefined?appearance.prefixText:content):
              (appearance.labelText||appearance.captionText||content)):content,
            style:customized?[props.style,{
              ...(override.textColor||override.textProfitColor!==undefined?{color:appearance.textColor}:{}),
              ...(override.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
              ...(override.fontWeight!==undefined?{fontWeight:appearance.fontWeight}:{}),
              ...(override.fontFamily!==undefined?{fontFamily:appearance.fontFamily==='system'?undefined:appearance.fontFamily}:{}),
              ...(override.fontStyle!==undefined?{fontStyle:appearance.fontStyle}:{}),
              ...(override.textDecorationLine!==undefined?{textDecorationLine:appearance.textDecorationLine}:{}),
              ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
              ...(override.lineHeight!==undefined&&appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}),
              ...(isPrefix&&override.prefixGap!==undefined?{marginRight:appearance.prefixGap}:{}),
              ...(isPrefix&&(override.prefixOffsetX!==undefined||override.prefixOffsetY!==undefined)?{transform:[{translateX:appearance.prefixOffsetX},{translateY:appearance.prefixOffsetY}]}:{}),
              ...(override.align?{textAlign:appearance.align}:{}),
              ...(override.backgroundColor||override.backgroundProfitColor!==undefined||override.backgroundOpacity!==undefined?{backgroundColor:colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)}:{}),
              ...(override.borderColor||override.borderProfitColor!==undefined?{borderColor:appearance.borderColor}:{}),
              ...(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
              ...(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
              ...(override.padding!==undefined?{padding:appearance.padding}:{}),
            }]:props.style,
          })}
        </InspectableTarget>;
      }
    }
    const props=child.props as {children?:ReactNode};
    if(props.children!==undefined){
      return cloneElement(child as ReactElement<{children?:ReactNode}>,{
        children:decorateContent(props.children,frame,nodeId),
      });
    }
    return child;
  });
}

export function PageEditorStack({pageKey,frames}:{pageKey:MainPageKey;frames:readonly EditorFrameItem[]}){
  const {config,displayConfig}=usePageEditor(pageKey);
  const engineer=useMaintenance();
  const theme=useThemeRuntime();
  const session=engineer.session?.page===pageKey?engineer.session:null;
  const effectiveDisplay=session?session.draftDisplay:displayConfig;
  const ordered=[...frames]
    .filter(item => config[item.key]?.visible !== false)
    .sort((a,b)=>(session&&session.frameKey===a.key?session.draft.order:config[a.key]?.order??0)
      -(session&&session.frameKey===b.key?session.draft.order:config[b.key]?.order??0));

  return <View style={{gap:12}}>{ordered.map(item=>{
    const active=session?.frameKey===item.key;
    const frameConfig=active&&session?session.draft:config[item.key];
    const instances=active&&session?session.draftInstances:engineer.getInstances(pageKey,item.key);
    const workspace=engineer.getWorkspace(pageKey,item.key);
    const frame:FrameMaintenanceContext={
      page:pageKey,frameKey:item.key,frameTitle:item.element.props.title,
      frameConfig:frameConfig!,displayConfig:effectiveDisplay,
    };
    const open=(instanceId?:string)=>{
      const source=config[item.key];if(!source)return;
      engineer.begin(pageKey,item.key,item.element.props.title,source,instanceId,displayConfig);
    };
    const originalAction=item.element.props.action;
    return <WorkspaceSurface key={item.key} config={active&&frameConfig?.width?{...workspace,width:Math.max(workspace.width,frameConfig.width)}:workspace} active={Boolean(active&&engineer.enabled)}
      onBounds={bounds=>engineer.reportWorkspaceBounds(pageKey,item.key,bounds)}>
      {cloneElement(item.element,{
      key:item.key,
      layout:frameConfig?.layout??'standard',
      appearance:frameConfig?.appearance??'theme',
      ...(frameConfig?{editorStyle:frameConfig}:{}),
      workActive:active,
      workHidden:active&&session?.scope==='frame'&&!session.draft.visible,
      action:<View style={{flexDirection:'row',gap:6,alignItems:'center'}}>
        {originalAction}
        {engineer.enabled?<Pressable accessibilityRole="button" accessibilityLabel={'呼叫'+item.element.props.title+'維護工程師'} onPress={()=>open()} style={{minWidth:36,minHeight:36,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:18,borderColor:theme.palette.primary}}>
          <Text style={{fontSize:17}}>🔧</Text>
        </Pressable>:null}
      </View>,
      children:<>{decorateContent(item.element.props.children,frame)}
        {instances.length?<InstalledFrameComponents instances={instances} frame={frame} enabled={engineer.enabled}
          activeId={active&&session?.scope==='instance'?session.instanceId:undefined}
          onWrench={id=>open(id)}/>:null}
      </>,
    })}
    </WorkspaceSurface>;
  })}</View>;
}
