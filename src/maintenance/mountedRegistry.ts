/** Last mounted measurement wins; removing it restores a surviving sibling. */
export class MountedRegistry<T>{
  private entries=new Map<string,Map<string,T>>();
  update(key:string,token:string,value:T|null):T|undefined{
    const instances=this.entries.get(key)??new Map<string,T>();
    if(value===null)instances.delete(token);else{instances.delete(token);instances.set(token,value);}
    if(instances.size===0){this.entries.delete(key);return undefined;}
    this.entries.set(key,instances);
    return Array.from(instances.values()).at(-1);
  }
}
