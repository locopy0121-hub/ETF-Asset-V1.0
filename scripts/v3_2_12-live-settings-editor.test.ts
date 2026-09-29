import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const picker=read('src/components/ColorPalettePicker.tsx');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const selection=read('src/editor/LayoutSelectionContext.tsx');
const editor=read('src/editor/editorModel.ts');
const wall=read('src/domain/uiModels.ts');
const chart=read('src/components/FloatingDashboardChart.tsx');
const metric=read('src/components/MetricTile.tsx');

const must=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};

// Upper workspace is the actual-page selector, not a separately modelled preview.
must(workbench.includes('實際頁面編輯區'),'missing actual-page editor surface');
must(workbench.includes('previewFrames.map(renderActualFrame)'),'actual frames are not rendered in the upper surface');
must(workbench.includes('LayoutSelectionProvider'),'actual component selection provider missing');
must(workbench.includes('滑到哪裡、點到哪裡'),'actual-page selection instruction missing');

// Chart editing is a first-class tool and must remain reachable even when hidden.
must(workbench.includes('顯示圖表'),'dashboard chart show/hide control missing');
must(workbench.includes('顯示 Mini 圖表'),'mini chart show/hide control missing');
must(workbench.includes('DashboardChartTools'),'dashboard chart editor missing');
must(workbench.includes('FloatingDashboardChart'),'real dashboard chart renderer missing from editor surface');
must(workbench.includes("selection.id.startsWith('chart:')"),'chart selection bridge missing');

// Never expose storage sentinels to users as layout dimensions.
must(!workbench.includes('（跟隨）'),'follow sentinel leaked into editor UI');
must(!workbench.includes('（自動）'),'auto sentinel leaked into editor UI');
must(!workbench.includes('min={-1}'),'negative sentinel remains editable');
must(!workbench.includes('function ModeStep'),'legacy auto/fixed size switch remains');
must(workbench.includes('frameMeasurements'),'rendered frame dimensions are not captured');
must(selection.includes('width?:number;height?:number'),'rendered target dimensions are not carried by selection');

// Restore actions require explicit confirmation.
must(workbench.includes("Alert.alert('確認恢復目前物件'"),'target restore confirmation missing');
must(modal.includes("Alert.alert(\n    '確認恢復本頁預設排版'"),'page restore confirmation missing');

// Existing color controls only gain transparency; no alternate color model is introduced.
must(picker.includes('onOpacityChange'),'color picker opacity API missing');
must(picker.includes('透明度'),'color picker opacity UI missing');
must(editor.includes('accentOpacity'),'dashboard chart color opacity storage missing');
must(editor.includes('titleOpacity'),'frame title opacity storage missing');
must(wall.includes('secondaryTextOpacity'),'holding card color opacity storage missing');
must(chart.includes('const accentColor=rgba'),'chart opacity is not applied by renderer');
must(metric.includes('surface.textOpacity'),'metric text opacity is not applied by renderer');

console.log('V3.2.12 live settings editor contract PASS');
