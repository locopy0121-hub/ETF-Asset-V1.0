export type SystemProfitColors=Readonly<{
  gainColor:string;
  lossColor:string;
  neutralColor:string;
  profitColorMode?:'red-up-green-down'|'green-up-red-down';
}>;

export function resolveSystemProfitColors(colors:SystemProfitColors){
  const reversed=colors.profitColorMode==='green-up-red-down';
  return {gainColor:reversed?colors.lossColor:colors.gainColor,lossColor:reversed?colors.gainColor:colors.lossColor,neutralColor:colors.neutralColor};
}

export function buildSystemColorChoices(input:SystemProfitColors){
  const colors=resolveSystemProfitColors(input);
  return [
    {key:'gain' as const,label:'系統上漲色',color:colors.gainColor},
    {key:'loss' as const,label:'系統下跌色',color:colors.lossColor},
    {key:'neutral' as const,label:'系統中性色',color:colors.neutralColor},
  ];
}
