import assert from 'node:assert/strict';
import {linkedColor} from '../src/maintenance/workspaceModel';
const prefs={gainColor:'#123456',lossColor:'#654321',neutralColor:'#ABCDEF',profitColorMode:'green-up-red-down' as const};
assert.equal(linkedColor('#FFFFFF',true,'gain',prefs),'#654321','positive values must respect reversed mapping');
assert.equal(linkedColor('#FFFFFF',true,'loss',prefs),'#123456');
assert.equal(linkedColor('#FFFFFF',true,'neutral',prefs),'#ABCDEF');
assert.equal(linkedColor('#FFFFFF',false,'gain',prefs),'#FFFFFF','disabled link keeps custom color');
assert.equal(linkedColor('#FFFFFF',true,'gain',{...prefs,profitColorMode:'red-up-green-down'}),'#123456');
console.log('Global profit color mapping / custom override PASS');
