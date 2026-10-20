/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.37',androidVersionCode:50037,headline:'圖表設定預覽與實際畫面同步修護',
 changes:[
  {id:'frame-preview-style',title:'設定預覽與實際頁共用框架排版',detail:'修正設定預覽遺漏排列密度與外觀模式的問題；正式頁與預覽共用框架視覺參數，保留原有顏色、邊框與尺寸。'},
  {id:'taiex-preview-empty',title:'沒有快取行情時保留加權指數圖表',detail:'預覽沒有官方行情快取時仍顯示實際可編輯繪圖區及資料不足說明，不造假價格線或三關價。'},
  {id:'taiex-chart-height',title:'加權指數圖表與左側數值軸同步高度',detail:'圖表和左側數值軸採用相同已儲存高度；取消固定 300 畫布造成的裁切和錯位。'},
  {id:'chart-parity-regression',title:'加強頁面圖表編輯回歸驗證',detail:'針對不同排版、樣式、已儲存尺寸及空資料的預覽一致性增加測試，保留既有圖表手勢與歷版品質檢查。'},
 ],
 notice:'本版 QA 驗收須在 Android 真機確認；資料點數依官方快取可能與即時畫面不同，不能因此虛構走勢。受保護的系統設定主頁不變。',
} as const;
