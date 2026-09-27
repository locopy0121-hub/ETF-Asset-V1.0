import type {InspectedTarget} from './inspectionModel';

// Ephemeral, read-only snapshot of the actual mounted A. Never persist, simulate or infer a provider.
export function inspectLiveTargetSource(target:InspectedTarget){
 return {
  page:target.page,frameKey:target.frameKey,targetId:target.id,kind:target.kind,
  upstreamStatus:'unverified' as const,
  fields:target.properties.map(row=>({name:row.name,value:row.value,originReadOnly:row.readOnly===true})),
 };
}
