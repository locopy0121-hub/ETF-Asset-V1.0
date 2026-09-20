export type DisplayPaletteKey='light'|'dark'|'glass'|'blue'|'warm';
export type DisplayPalette=Readonly<{
  key:DisplayPaletteKey;
  label:string;
  backgroundColor:string;
  textColor:string;
  secondaryTextColor:string;
  gainColor:string;
  lossColor:string;
  neutralColor:string;
  borderColor:string;
  backgroundOpacity:number;
}>;

export const DISPLAY_PALETTES:readonly DisplayPalette[]=[
  {key:'light',label:'明亮',backgroundColor:'#FFFFFF',textColor:'#0F172A',secondaryTextColor:'#64748B',gainColor:'#EF4444',lossColor:'#10B981',neutralColor:'#64748B',borderColor:'#E2E8F0',backgroundOpacity:.96},
  {key:'dark',label:'深色',backgroundColor:'#0F172A',textColor:'#FFFFFF',secondaryTextColor:'#CBD5E1',gainColor:'#FB7185',lossColor:'#34D399',neutralColor:'#94A3B8',borderColor:'#334155',backgroundOpacity:.94},
  {key:'glass',label:'透明玻璃',backgroundColor:'#111827',textColor:'#F8FAFC',secondaryTextColor:'#CBD5E1',gainColor:'#F87171',lossColor:'#4ADE80',neutralColor:'#94A3B8',borderColor:'#64748B',backgroundOpacity:.72},
  {key:'blue',label:'藍色科技',backgroundColor:'#0B1F3A',textColor:'#EFF6FF',secondaryTextColor:'#93C5FD',gainColor:'#FB7185',lossColor:'#34D399',neutralColor:'#93C5FD',borderColor:'#2563EB',backgroundOpacity:.94},
  {key:'warm',label:'暖色',backgroundColor:'#FFF7ED',textColor:'#431407',secondaryTextColor:'#9A3412',gainColor:'#DC2626',lossColor:'#059669',neutralColor:'#78716C',borderColor:'#FDBA74',backgroundOpacity:.96},
];

export function paletteByKey(key:DisplayPaletteKey){return DISPLAY_PALETTES.find(p=>p.key===key)??DISPLAY_PALETTES[0]!;}
