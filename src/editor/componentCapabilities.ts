export type EditorComponentType =
  | 'frame'
  | 'title'
  | 'data'
  | 'image'
  | 'icon'
  | 'chart'
  | 'reminder'
  | 'marquee'
  | 'calendar';

export type EditorCapabilityGroup = Readonly<{
  key:string;
  label:string;
  tools:readonly string[];
}>;

const commonLayout=['顯示／隱藏','位置','寬度','高度','內距','外距','對齊','圖層','鎖定','透明度','複製樣式','重設'];
const commonAppearance=['背景顏色','背景透明度','邊框顏色','邊框粗細','邊框樣式','圓角','陰影'];

export const COMPONENT_CAPABILITIES:Readonly<Record<EditorComponentType,readonly EditorCapabilityGroup[]>>={
  frame:[
    {key:'layout',label:'版面',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
    {key:'behavior',label:'排序／行為',tools:['手動排序','自動順位','鎖定']},
  ],
  title:[
    {key:'text',label:'文字',tools:['文字內容','字體大小','字體粗細','文字顏色','文字背景','行高','字距','換行','省略']},
    {key:'alignment',label:'對齊',tools:['水平對齊','垂直對齊']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'背景／邊框',tools:commonAppearance},
    {key:'motion',label:'動畫',tools:['無','淡入','閃爍','跳動']},
  ],
  data:[
    {key:'binding',label:'資料',tools:['資料來源','欄位','格式','小數位','千分位','前綴／後綴']},
    {key:'profit',label:'損益色',tools:['跟隨全域','上漲色','下跌色','平盤色']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
  image:[
    {key:'source',label:'圖片',tools:['圖片來源','填滿','適合','裁切','比例鎖定']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
  icon:[
    {key:'icon',label:'圖示',tools:['圖示庫','大小','顏色']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
  chart:[
    {key:'data',label:'資料',tools:['資料來源','X 軸','Y 軸','系列','篩選','排序','多系列']},
    {key:'style',label:'圖表',tools:['圖表類型','系列顏色','損益色','線寬','資料點','資料標籤','圖例']},
    {key:'axes',label:'座標／格線',tools:['X 軸','Y 軸','格線','Tooltip','十字線']},
    {key:'appearance',label:'外框／背景',tools:[...commonAppearance,'內容透明度','Padding']},
    {key:'interaction',label:'互動',tools:['兩指縮放','單指平移','雙擊重設','縮放邊界','記憶縮放','觸控穿透']},
    {key:'finance',label:'金融標記',tools:['成本線','現價線','基準線','買入','賣出','除息','配息','新聞事件']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
  ],
  reminder:[
    {key:'rule',label:'提醒',tools:['條件','日期','時間','僅符合時顯示']},
    {key:'motion',label:'特效',tools:['無','閃爍','跳動']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
  marquee:[
    {key:'content',label:'內容',tools:['文字','資料來源']},
    {key:'motion',label:'跑馬燈',tools:['方向','速度','循環','暫停']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
  calendar:[
    {key:'data',label:'日期／事件',tools:['月份','日期格式','事件來源','事件狀態']},
    {key:'style',label:'樣式',tools:['今日','選取日','事件色','星期列']},
    {key:'layout',label:'位置尺寸',tools:commonLayout},
    {key:'appearance',label:'外觀',tools:commonAppearance},
  ],
};

export const getComponentCapabilities=(type:EditorComponentType)=>COMPONENT_CAPABILITIES[type];

export const AB_COLLAPSE_RULES={
  defaultCollapsed:true,
  singleOpenPerLevel:true,
  closeSiblingOnOpen:true,
  preserveUneditedCollapsed:true,
} as const;
