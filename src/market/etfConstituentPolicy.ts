const DAY=86_400_000,TAIPEI_OFFSET=8*60*60*1000;
const CHECKPOINTS=[8*60+30,13*60+20,14*60+30];
export function nextEtfConstituentCheck(now:number):number{
  const taipei=new Date(now+TAIPEI_OFFSET);
  const midnight=Date.UTC(taipei.getUTCFullYear(),taipei.getUTCMonth(),taipei.getUTCDate())-TAIPEI_OFFSET;
  for(let day=0;day<4;day++)for(const minutes of CHECKPOINTS){
    const next=midnight+day*DAY+minutes*60_000;
    if(next>now&&![0,6].includes(new Date(next+TAIPEI_OFFSET).getUTCDay()))return next;
  }
  return midnight+4*DAY+CHECKPOINTS[0]!*60_000;
}
export function shouldRefreshEtfConstituents(fetchedAt:number|null|undefined,now:number):boolean{
  if(!fetchedAt||!Number.isFinite(fetchedAt)||fetchedAt>now)return true;
  const local=new Date(now+TAIPEI_OFFSET),previous=new Date(fetchedAt+TAIPEI_OFFSET);
  if(local.toISOString().slice(0,10)!==previous.toISOString().slice(0,10))return true;
  const midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-TAIPEI_OFFSET;
  return ![0,6].includes(local.getUTCDay())&&CHECKPOINTS.some(minutes=>{const checkpoint=midnight+minutes*60_000;return now>=checkpoint&&fetchedAt<checkpoint;});
}
