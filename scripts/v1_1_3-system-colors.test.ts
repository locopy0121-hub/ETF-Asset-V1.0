import assert from 'node:assert/strict';

import {buildSystemColorChoices} from '../src/settings/systemColorPalette';

assert.deepEqual(buildSystemColorChoices({
  gainColor:'#AA1122',
  lossColor:'#11AA22',
  neutralColor:'#334455',
}),[
  {key:'gain',label:'系統上漲色',color:'#AA1122'},
  {key:'loss',label:'系統下跌色',color:'#11AA22'},
  {key:'neutral',label:'系統中性色',color:'#334455'},
]);

console.log('V1.1.3 system profit colors: PASS');
