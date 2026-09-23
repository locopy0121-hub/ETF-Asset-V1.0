export type SystemProfitColors=Readonly<{
  gainColor:string;
  lossColor:string;
  neutralColor:string;
}>;

export function buildSystemColorChoices(colors:SystemProfitColors){
  return [
    {key:'gain' as const,label:'系統上漲色',color:colors.gainColor},
    {key:'loss' as const,label:'系統下跌色',color:colors.lossColor},
    {key:'neutral' as const,label:'系統中性色',color:colors.neutralColor},
  ];
}
