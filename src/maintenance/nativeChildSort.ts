import {isEngineerOwnedInstance,type MaintenanceInstance} from './componentLibrary';
/** One native parent; never move or overwrite built-in items or foreign siblings. */
export function childDragSteps(dy:number,rowHeight=52):number{
 if(!Number.isFinite(dy)||!Number.isFinite(rowHeight)||rowHeight<=0||Math.abs(dy)<rowHeight*.48)return 0;
 return Math.max(-30,Math.min(30,Math.round(dy/rowHeight)||Math.sign(dy)));
}
export function reorderOwnedSiblings(
 instances:readonly MaintenanceInstance[],parentId:string,childId:string,steps:number
):readonly MaintenanceInstance[]{
 const parent=instances.find(x=>x.id===parentId);
 if(!parent||parent.templateId!=='parent-frame'||!isEngineerOwnedInstance(parent)||
   !Number.isInteger(steps)||steps===0)return instances;
 const positions=instances.flatMap((x,index)=>x.parentId===parentId&&isEngineerOwnedInstance(x)?[index]:[]);
 const from=positions.findIndex(index=>instances[index]?.id===childId);
 if(from<0)return instances;
 const to=Math.max(0,Math.min(positions.length-1,from+steps));
 if(to===from)return instances;
 const next=[...instances],siblings=positions.map(i=>instances[i]!);
 const [moving]=siblings.splice(from,1);
 siblings.splice(to,0,moving!);
 positions.forEach((position,index)=>{next[position]=siblings[index]!;});
 return next;
}

/** Screen-reader reorder is allowed only for a real sibling and a known action. */
export function accessibleChildMove(action:string,index:number,total:number):-1|0|1{
 if(!Number.isInteger(index)||!Number.isInteger(total)||total<2||index<0||index>=total)return 0;
 if(action==='increment')return index<total-1?1:0;
 if(action==='decrement')return index>0?-1:0;
 return 0;
}
