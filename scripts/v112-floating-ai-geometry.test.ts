import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  clampFloatingPanelSize,
  clampFloatingPoint,
  getFloatingBounds,
  snapFloatingPoint,
} from '../src/components/floatingAiGeometry';

const viewport={width:360,height:800};
const panel=clampFloatingPanelSize({width:999,height:999},viewport);
assert.deepEqual(panel,{width:344,height:670},'panel must stay inside viewport bounds');
assert.deepEqual(clampFloatingPanelSize({width:100,height:100},viewport),{width:280,height:300},'panel must preserve usable minimum size');

const bounds=getFloatingBounds(viewport,{width:300,height:400});
assert.deepEqual(bounds,{maxX:52,maxY:314});
assert.deepEqual(clampFloatingPoint({x:-100,y:999},bounds),{x:8,y:314},'drag result must remain on-screen');
assert.deepEqual(snapFloatingPoint({x:12,y:100},bounds,true),{x:8,y:100},'left-half release must snap left');
assert.deepEqual(snapFloatingPoint({x:50,y:100},bounds,true),{x:52,y:100},'right-half release must snap right');
assert.deepEqual(snapFloatingPoint({x:24,y:100},bounds,false),{x:24,y:100},'snap-off must preserve clamped x position');

const floating=readFileSync('src/components/GlobalFloatingAi.tsx','utf8');
const box=readFileSync('src/components/AiQuestionBox.tsx','utf8');
assert.match(floating,/onStartShouldSetPanResponder:\(\)=>false/,'drag responder must not steal header/button taps');
assert.match(floating,/const responder=useMemo\(\(\)=>PanResponder\.create\([\s\S]*?\}\),\[\]\);/,'drag responder must remain stable throughout a gesture');
assert.match(floating,/const resizeResponder=useMemo\(\(\)=>PanResponder\.create\([\s\S]*?\}\),\[\]\);/,'resize responder must remain stable throughout a gesture');
assert.match(floating,/positionLockedRef\.current/,'drag lock must be evaluated live without rebuilding responder');
assert.match(floating,/patchAiRef\.current\(\{panelWidth:next\.width,panelHeight:next\.height\}\)/,'resize release must persist the final size');
assert.match(floating,/<AiQuestionBox[\s\S]*?\bflex\b/,'floating panel must use flexible AI content height');
assert.match(box,/rootFlex:\{flex:1,minHeight:170\}/,'AI question box must support compact resizable panels');

console.log('v1.1.2 FLOATING AI GEOMETRY / GESTURE: PASS');
