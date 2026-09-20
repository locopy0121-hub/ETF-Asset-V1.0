export type RelationNode<TKind extends string=string> = {
  id: string;
  kind: TKind;
  label: string;
  parentId?: string;
};

export type DirectRelation = {
  parentId: string;
  childId: string;
};

/**
 * A-B Relationship Law
 * Only a direct adjacent parent-child edge is valid.
 * B may become A in the next relation.
 */
export function isDirectChild(parent:RelationNode,child:RelationNode){
  return child.parentId===parent.id;
}

export function assertDirectRelation(parent:RelationNode,child:RelationNode){
  if(!isDirectChild(parent,child)){
    throw new Error(`A-B relationship violation: ${parent.id} cannot directly control ${child.id}`);
  }
  return true;
}

export function relationshipPath(nodes:readonly RelationNode[],targetId:string){
  const byId=new Map(nodes.map(node=>[node.id,node] as const));
  const path:RelationNode[]=[];
  let cursor=byId.get(targetId);
  while(cursor){
    path.unshift(cursor);
    cursor=cursor.parentId?byId.get(cursor.parentId):undefined;
  }
  return path;
}
