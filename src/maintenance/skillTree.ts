// A is selected by the local wrench. B is an always-visible full skill tree;
// C is a specific tool; D is its editable parameter/contract.
export type SkillTool=Readonly<{id:string;label:string;field?:string;detail:string;status:'ready'|'adapter-required'}>;
export type EngineerSkill=Readonly<{id:string;label:string;description:string;tools:readonly SkillTool[]}>;
const ready=(id:string,label:string,field:string,detail:string):SkillTool=>({id,label,field,detail,status:'ready'});
const later=(id:string,label:string,detail:string):SkillTool=>({id,label,detail,status:'adapter-required'});
export const ENGINEER_SKILLS:readonly EngineerSkill[]=[
  {id:'components',label:'元件工程',description:'中央元件庫、插入、文字內容、移除',tools:[ready('install','中央元件庫','instances','可新增父框架，並在其內新增工程師元件'),ready('parent-size','新增父框架尺寸','instance:parent-size','獨立設定寬高；父框架不會自動啟用內部捲動'),ready('added-style-sync','工程師新增元件：同類外觀同步','instance:sync','字號與色彩同類同步；同框架／本頁／全 App 可明確指定，原始內容與布局各自獨立'),ready('edit-copy','文字內容','instance-text','新增文字內容'),ready('remove','刪除工程師新增元件','instances','僅能刪除本工程師所建立的獨立元件實例，二次確認；取消可還原，套用才儲存；內建 App 元件永久禁止刪除'),ready('inspect-existing','讀取既有元件設定','target:inspect','顯示即時數據與真正來源設定，不更動業務數值'),later('complex','專業元件安裝','逐類接入資料／功能 Runtime')]},
  {id:'frames',label:'專業框架工程',description:'背景／邊框／陰影／光圈／內外距／動畫與適配；僅對目前框架生效',tools:[
    ready('border-width','邊框粗細','borderWidth','0–8 px'),
    ready('radius','框架圓角','borderRadius','0–48 px'),
    ready('background-opacity','背景透明度','backgroundOpacity','0–100%'),
    ready('appearance','框架樣式','appearance','主題／柔和／描邊'),
    ready('frame-bg','① 背景主色','backgroundColor','完整 Color Picker，支援損益色獨立開關'),
    ready('fx-bg-mode','① 背景模式','framefx:backgroundMode','純色／雙色或三色漸層／框架背景圖片'),
    ready('fx-bg-end','① 第二漸層色','framefx:gradientEndColor','Color Picker 與獨立損益色開關'),
    ready('fx-bg-direction','① 漸層方向','framefx:gradientDirection','上下或左右，16 色階直接在原始框架顯示'),
    ready('fx-bg-middle-on','① 第三色漸層開關','framefx:gradientMidEnabled','開啟中間色，保留舊有雙色模式'),
    ready('fx-bg-middle','① 第三漸層色','framefx:gradientMidColor','Color Picker 與獨立損益色'),
    ready('fx-bg-middle-stop','① 第三色停止點','framefx:gradientMidStop','10%～90%，調整中間色的位置'),
    ready('fx-img-source','① 背景圖片來源','framefx:imageSource','內建 10 張／Android 自訂 SAF 圖片'),
    ready('fx-img-index','① 內建背景圖庫','framefx:imageIndex','10 張可點選實際圖片，獨立套用當前框架'),
    ready('fx-img-uri','① 自訂框架背景','framefx:imageUri','Android 系統相簿／檔案選擇器，可取消；不輸入遠端網址'),
    ready('fx-img-fit','① 背景圖片填滿方式','framefx:imageFit','填滿裁切／適合完整顯示／拉伸'),
    ready('fx-img-alpha','① 背景圖片透明度','framefx:imageOpacity','0～100%，只改圖片，不降低文字可讀性'),
    ready('fx-mask-color','① 背景遮罩顏色','framefx:maskColor','Color Picker 與獨立損益色'),
    ready('fx-mask-opacity','① 背景遮罩強度','framefx:maskOpacity','0～100%，僅疊在圖片或漸層的背後，文字維持原色'),
    ready('fx-border-style','② 邊框線條','framefx:borderStyle','實線／虛線／點線'),
    ready('frame-border-color','② 邊框主色','borderColor','Color Picker 與原有邊框損益色'),
    ready('fx-top-border','② 上邊框粗細','framefx:borderTop','−1 沿用主設定；0–8 dp'),
    ready('fx-right-border','② 右邊框粗細','framefx:borderRight','−1 沿用主設定；0–8 dp'),
    ready('fx-bottom-border','② 下邊框粗細','framefx:borderBottom','−1 沿用主設定；0–8 dp'),
    ready('fx-left-border','② 左邊框粗細','framefx:borderLeft','−1 沿用主設定；0–8 dp'),
    ready('fx-corner-tl','② 左上獨立圓角','framefx:cornerTopLeft','−1 沿用主設定；0–48 dp'),
    ready('fx-corner-tr','② 右上獨立圓角','framefx:cornerTopRight','−1 沿用主設定；0–48 dp'),
    ready('fx-corner-br','② 右下獨立圓角','framefx:cornerBottomRight','−1 沿用主設定；0–48 dp'),
    ready('fx-corner-bl','② 左下獨立圓角','framefx:cornerBottomLeft','−1 沿用主設定；0–48 dp'),
    ready('frame-shadow','③ 陰影總開關','shadowEnabled','原生 iOS shadow 與 Android elevation'),
    ready('frame-shadow-opacity','③ 陰影透明度','shadowOpacity','0–80%'),
    ready('fx-shadow-color','③ 陰影顏色','framefx:shadowColor','Color Picker 與損益色'),
    ready('fx-shadow-blur','③ 陰影模糊','framefx:shadowBlur','0–48 dp 原生 shadowRadius／elevation'),
    ready('fx-shadow-x','③ 陰影水平偏移','framefx:shadowOffsetX','−24～24 dp'),
    ready('fx-shadow-y','③ 陰影垂直偏移','framefx:shadowOffsetY','−24～24 dp'),
    ready('fx-glow-on','④ 內光圈開關','framefx:glowEnabled','使用不遮字的內邊緣彩色光圈'),
    ready('fx-glow-color','④ 光圈顏色','framefx:glowColor','Color Picker 與獨立損益色'),
    ready('fx-glow-opacity','④ 光圈透明度','framefx:glowOpacity','0–80%'),
    ready('fx-glow-width','④ 光圈寬度','framefx:glowWidth','0–16 dp'),
    ready('fx-glow-pulse','⑧ 光圈呼吸動畫','framefx:glowPulse','遵守系統降低動態設定，僅動畫邊框'),
    ready('fx-glow-period','⑧ 呼吸週期','framefx:glowPeriodMs','800～4000 ms'),
    ready('fx-padding-top','⑥ 上內距','framefx:paddingTop','−1 沿用框架內距；0–32 dp'),
    ready('fx-padding-right','⑥ 右內距','framefx:paddingRight','−1 沿用框架內距；0–32 dp'),
    ready('fx-padding-bottom','⑥ 下內距','framefx:paddingBottom','−1 沿用框架內距；0–32 dp'),
    ready('fx-padding-left','⑥ 左內距','framefx:paddingLeft','−1 沿用框架內距；0–32 dp'),
    ready('fx-content-gap','⑦ 內容間距','framefx:contentGap','−1 沿用原版；0–40 dp'),
    ready('fx-margin-vertical','⑥ 框架上下外距','framefx:marginVertical','0–32 dp'),
    ready('fx-max-width','⑩ 框架最大寬度','framefx:maxWidth','0 為不限；其他 0–1600 dp'),
    ready('target-border-width','元件邊框粗細','target:borderWidth','0–8 px'),
    ready('target-border-radius','元件圓角','target:borderRadius','0–48 px'),
    later('fx-background-image','① 圖片裁切位置／跨手機檔案移轉','背景圖片及遮罩已接入；裁切位置與跨裝置自動嵌入仍需原生適配'),
    later('fx-multi-gradient','① 任意角度漸層','雙色／三色水平與垂直已接入；任意角度須高性能原生漸層引擎'),
    later('fx-border-grad','② 漸層／雙層邊框','需原生自訂繪製'),
    later('fx-shadow-spread','③ 精準陰影擴散／多層','Android 原生相容性驗證後接入'),
    later('fx-outer-glow','④ 外側柔光暈','須避免與卡片陰影裁切衝突'),
    later('fx-glass','⑤ 毛玻璃／磨砂與材質','需額外原生 Blur Runtime，不提供假選項'),
    later('fx-drag-sort','⑦ 子元件拖曳排序','待接入實際 Flex 佈局與手勢'),
    later('fx-animation-advanced','⑧ 滑入／縮放／旋轉動畫','原生動畫及無障礙驗證後接入'),
    later('fx-frame-interaction','⑨ 框架點擊／長按','必須排除內部按鈕手勢衝突'),
    later('fx-responsive','⑩ 尺寸斷點／跨頁中央模板','需安全版本化共享及局部適配')
  ]},
  {id:'dimensions',label:'空間尺寸',description:'內距、最小高度與空間分配',tools:[ready('frame-size','父框架實際長寬','frame:size','真正改變父框架 W/H；±1 dp、精確輸入、恢復自適應；與編輯畫布及子元件尺寸分離'),ready('padding','內距','padding','0–32 px'),ready('min-height','最小高度','minHeight','0–600 px'),ready('target-padding','元件內距','target:padding','0–32 px'),ready('workspace-size','工作區長寬','workspace:size','自由設計工作區，Mobile 超寬時可水平捲動'),ready('target-dimensions','原有元件長寬','target:dimensions','讀取真實 W/H，手動設定寬高'),later('resize-gesture','手勢縮放','需逐個視圖接入真實測量')]},
  {id:'layout',label:'排列定位',description:'密度、標題對齊與順序',tools:[ready('density','排列密度','layout','標準／緊湊／密集'),ready('align','標題對齊','titleAlign','靠左／置中／靠右'),ready('target-align','元件內容對齊','target:align','靠左／置中／靠右'),ready('target-xy','真實 XY 精密定位','target:xy','畫面即時座標、固定 ±1 dp、手動輸入、對齊快捷'),ready('target-anchors','自適應錨點','target:anchors','左右上下中心錨點，工作區變更時維持相對關係'),ready('workspace-guides','XY 軸與基準網格','workspace:guides','中心線與網格是視覺輔助，不強迫貼齊'),ready('workspace-snap','自選智慧吸附','workspace:snapping','Mobile 預設 OFF；只在拖曳放手時吸附，不影響 ±1 或手動輸入'),ready('workspace-diagnostics','超界與重疊診斷','workspace:diagnostics','以真實量測的元件邊界計算'),ready('page-holding-layout','頁面設定：行情排列','page:holdingLayoutMode','單欄／雙欄／三欄／橫向及雙欄滑動'),later('drag-sort','拖移排序','待接入跨元件排序手勢')]},
  {id:'typography',label:'文字編輯',description:'文字大小、顏色與內容',tools:[ready('font-size','標題字號','titleFontSize','10–32 px'),ready('title-color','標題顏色','titleColor','全系統 Color Picker'),ready('target-font','元件數值字號','target:fontSize','8–48 px'),ready('target-label-font','元件標題字號','target:labelFontSize','8–32 px'),ready('target-caption-font','元件說明字號','target:captionFontSize','8–30 px'),ready('target-weight','粗體與字重','target:fontWeight','正常／粗體／100–900 字重'),ready('target-italic','斜體','target:fontStyle','正常或斜體'),ready('target-decoration','底線與刪除線','target:textDecorationLine','無／底線／刪除線／兩者'),ready('target-letter-spacing','字距','target:letterSpacing','−4 至 16 dp'),ready('target-line-height','行高','target:lineHeight','0=沿用元件；最多 96 dp'),ready('font-family','字型家族','target:fontFamily','系統／無襯線／窄體／襯線／等寬；裝置缺少字型時採平台替代'),ready('label-weight','卡片標題字重','target:labelFontWeight','只作用於目前 KPI 卡片標題'),ready('label-italic','卡片標題斜體','target:labelFontStyle','只作用於目前 KPI 卡片標題'),ready('label-spacing','卡片標題字距','target:labelLetterSpacing','−4～16 dp'),ready('label-line-height','卡片標題行高','target:labelLineHeight','0＝沿用原始'),ready('caption-weight','卡片說明字重','target:captionFontWeight','只作用於目前 KPI 卡片說明'),ready('caption-italic','卡片說明斜體','target:captionFontStyle','只作用於目前 KPI 卡片說明'),ready('caption-spacing','卡片說明字距','target:captionLetterSpacing','−4～16 dp'),ready('caption-line-height','卡片說明行高','target:captionLineHeight','0＝沿用原始'),ready('target-label-text','自訂標題文字','target:labelText','只更改顯示標籤，不更改金融資料'),ready('target-caption-text','自訂說明文字','target:captionText','只更改畫面說明，不更改金融資料')]},
  {id:'numbers',label:'數值呈現',description:'數據顯示格式，不碰帳務公式',tools:[ready('target-source','目前元件數據來源','target:inspect','唯讀顯示實際資料來源、值與原始格式'),later('units','單位與位數','僅修改格式，不可重算帳務'),ready('prefix','獨立貨幣前綴內容','target:prefixText','只改 NT$ 顯示文字，金額數值維持只讀'),ready('prefix-gap','前綴與金額間距','target:prefixGap','0–48 dp，僅目前前綴元件'),ready('prefix-offset-x','前綴左右位置','target:prefixOffsetX','−80～80 dp；專屬前綴 X 定位，不改變金額'),ready('prefix-offset-y','前綴上下微調','target:prefixOffsetY','−80～80 dp；只移動 NT$，不改金額排版')]},
  {id:'target-materials',label:'全元件材質與效果',description:'每個元件實例可獨立使用漸層、邊框、陰影、光暈、外距與安全預設；帳務資料完全鎖定',tools:[
    ready('material-presets','視覺預設','target:preset','柔和／高對比／極簡，只更新目前元件外觀，保留原始數值、可見狀態與座標'),
    ready('material-reset','重設目前元件外觀','target:resetVisual','只清除目前元件的視覺覆寫，保留文字內容、可見狀態與 XY 位置'),
    ready('material-mode','背景材質','target:backgroundMode','純色／雙色或三色漸層'),
    ready('material-direction','漸層方向','target:gradientDirection','水平／垂直，原位即時預覽'),
    ready('material-end','漸層終點色','target:gradientEndColor','Color Picker／獨立損益色開關'),
    ready('material-mid-enable','三色漸層開關','target:gradientMidEnabled','啟用／停用中間色'),
    ready('material-mid','漸層中間色','target:gradientMidColor','Color Picker／獨立損益色開關'),
    ready('material-mid-stop','中間色停止點','target:gradientMidStop','10～90%'),
    ready('material-border-style','邊框線型','target:borderStyle','實線／虛線／點線'),
    ready('material-margin-x','左右外距','target:marginHorizontal','0～32 dp，不改其他元件'),
    ready('material-margin-y','上下外距','target:marginVertical','0～32 dp，不改其他元件'),
    ready('material-shadow-on','陰影開關','target:shadowEnabled','開啟／關閉目前元件的陰影'),
    ready('material-shadow-color','陰影顏色','target:shadowColor','Color Picker／獨立損益色開關'),
    ready('material-shadow-opacity','陰影強度','target:shadowOpacity','0～80%，僅改陰影'),
    ready('material-shadow-blur','陰影柔邊','target:shadowBlur','0～48 dp'),
    ready('material-shadow-x','陰影水平偏移','target:shadowOffsetX','−24～24 dp'),
    ready('material-shadow-y','陰影垂直偏移','target:shadowOffsetY','−24～24 dp'),
    ready('material-glow-on','內緣光圈開關','target:glowEnabled','只繪製內邊緣，不覆蓋文字及數值'),
    ready('material-glow-color','光圈顏色','target:glowColor','Color Picker／獨立損益色開關'),
    ready('material-glow-opacity','光圈透明度','target:glowOpacity','0～80%'),
    ready('material-glow-width','光圈寬度','target:glowWidth','0～16 dp'),
    later('material-native-blur','即時磨砂玻璃／多層外光暈','需原生 GPU 與相容性驗證，禁止假開關'),
  ]},
  {id:'colors',label:'色彩工程',description:'Color Picker 與損益色整合',tools:[ready('background-color','背景顏色','backgroundColor','系統色盤'),ready('border-color','邊框顏色','borderColor','系統色盤'),ready('text-color','標題顏色','titleColor','系統色盤'),ready('target-text-color','元件文字顏色','target:textColor','統一使用系統調色盤'),ready('target-label-color','元件標題顏色','target:labelColor','統一使用系統調色盤'),ready('target-caption-color','元件說明顏色','target:captionColor','調色盤及獨立損益色'),ready('target-background','元件背景顏色','target:backgroundColor','統一使用系統調色盤'),ready('target-background-opacity','元件背景獨立透明度','target:backgroundOpacity','0–100%，只改背景，不使文字、圖示與財務數值變透明'),ready('target-border','元件邊框顏色','target:borderColor','統一使用系統調色盤'),ready('target-profit','既有數值損益連動','target:useProfitColor','保留舊資料相容，獨立連動選項請在各調色盤控制'),ready('target-tone','顏色來源語意','target:profitToneOverride','跟隨真實損益或手動選用視覺情境，不修改原數值')]},
  {id:'effects',label:'視覺特效',description:'陰影、透明度及擴充效果',tools:[ready('shadow-toggle','陰影開關','shadowEnabled','啟用／停用'),ready('shadow-opacity','陰影強度','shadowOpacity','0–80%'),ready('target-opacity','整體透明度（含內容）','target:opacity','0–100%；刻意讓整個元件及其內容一起淡化，與背景透明度嚴格分離'),later('blur','模糊與光暈','需檢查各裝置圖層相容性')]},
  {id:'animations',label:'動態動畫',description:'跑馬燈、呼吸燈、提醒動畫',tools:[later('marquee','跑馬燈','需綁定動畫與生命週期'),later('blink','閃爍','需處理無障礙降低動態')]},
  {id:'charts',label:'圖表工程',description:'K 線、十字線、成交量與指標',tools:[later('candlestick','K 線主圖','第七大項專屬圖表介接'),later('crosshair','十字線','保留 2.3.6 已 PASS 行為'),later('indicators','技術指標','資料來源及指標計算需專項驗證')]},
  {id:'interaction',label:'互動操作',description:'觸控、滑動、長按與縮放',tools:[ready('quote-style','頁面設定：行情模式','page:quoteStyle','純行情／＋圖表／精簡／進階'),later('tap','點擊行為','需確認權限及動作'),later('swipe','手勢互斥','需原生／實機驗證')]},
  {id:'data',label:'資訊呈現',description:'顯示與資料狀態',tools:[ready('visibility','框架顯示','visible','開啟／關閉'),ready('wall-settings','頁面設定：行情牆完整工具','page:wall','直接複用現有行情牆欄位、跑馬燈、色彩、效果工具'),ready('badge-settings','頁面設定：標籤與提醒','page:badges','直接複用官方標籤、配息、提醒及效果編輯器'),ready('list-settings','頁面設定：庫存清單','page:list','直接複用清單欄位及 A/B 視覺設定'),later('source','欄位資料來源','只讀資料映射，不得建立假資料')]},
  {id:'conditions',label:'條件顯示',description:'可見狀態與條件策略',tools:[ready('show-hide','顯示開關','visible','顯示／隱藏'),ready('target-visibility','元件顯示開關','target:visible','只影響當前已指定的元件'),later('threshold','狀態門檻','需要有效資料與門檻驗證')]},
  {id:'responsive',label:'裝置適配',description:'單雙三欄與內容溢出',tools:[ready('density-mode','框架密度','layout','以目前頁面環境查看'),later('breakpoint','斷點覆寫','需接入專屬元件響應式模型')]},
  {id:'sharing',label:'元件共享',description:'中央定義、局部實例及模板',tools:[later('save-template','儲存中央模板','共享模板變更必須確認影響範圍'),later('apply-elsewhere','複用實例','不能無提示覆寫其他頁面')]},
  {id:'versions',label:'版本維護',description:'暫存、套用、取消及回復',tools:[ready('transaction','套用／取消','session','套用持久化；取消丟棄本次全部草稿'),ready('history','歷史版本比較','maintenance:visual-history','當前 A 實際局部外觀最多十筆持久化版本；查看差異並只還原目前草稿')]},
];
export function findSkill(id:string){return ENGINEER_SKILLS.find(skill=>skill.id===id);}

// Navigation metadata changes presentation only; the singleton skill catalog remains intact.
export const ENGINEER_SKILL_SECTIONS=[
  {id:'structure',label:'元件與空間',skills:['components','frames','dimensions','layout','responsive']},
  {id:'appearance',label:'文字與外觀',skills:['typography','numbers','target-materials','colors','effects','animations']},
  {id:'experience',label:'圖表與互動',skills:['charts','interaction','data','conditions']},
  {id:'management',label:'共享與維護',skills:['sharing','versions']},
] as const;
export function skillCounts(skills:readonly EngineerSkill[]=ENGINEER_SKILLS){
  return skills.reduce((total,skill)=>({
    total:total.total+skill.tools.length,
    ready:total.ready+skill.tools.filter(tool=>tool.status==='ready').length,
    pending:total.pending+skill.tools.filter(tool=>tool.status==='adapter-required').length,
  }),{total:0,ready:0,pending:0});
}
export function skillMatches(skill:EngineerSkill,query:string){
  const word=query.trim().toLocaleLowerCase();
  return !word||[skill.label,skill.description,...skill.tools.flatMap(tool=>[tool.label,tool.detail])]
    .some(value=>value.toLocaleLowerCase().includes(word));
}
