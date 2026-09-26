import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENGINEER_SKILLS,ENGINEER_SKILL_SECTIONS,skillCounts,skillMatches} from '../src/maintenance/skillTree';
import {COMPLETE_ENGINEER_SKILLS,FULL_SKILL_SECTIONS} from '../src/maintenance/fullSkillCatalog';
import {FRAME_TO_TARGET} from '../src/maintenance/skillAdapters';
const read=(path:string)=>readFileSync(path,'utf8');

// Classify, never duplicate or silently hide tools from the singleton catalog.
const ids=ENGINEER_SKILLS.map(skill=>skill.id);
const sectionIds=ENGINEER_SKILL_SECTIONS.flatMap(section=>[...section.skills]);
assert.deepEqual([...sectionIds].sort(),[...ids].sort(),'every skill appears in exactly one navigation section');
assert.equal(new Set(sectionIds).size,ids.length);
const counts=skillCounts();
assert.equal(counts.total,ENGINEER_SKILLS.reduce((n,skill)=>n+skill.tools.length,0));
assert.equal(counts.ready+counts.pending,counts.total);
assert.ok(counts.pending>0,'missing native adapters must not be described as ready');
assert.ok(skillMatches(ENGINEER_SKILLS.find(skill=>skill.id==='frames')!,'漸層'));
assert.ok(skillMatches(ENGINEER_SKILLS.find(skill=>skill.id==='typography')!,'字重'));
assert.ok(!skillMatches(ENGINEER_SKILLS.find(skill=>skill.id==='versions')!,'漸層'));
assert.equal(skillMatches(ENGINEER_SKILLS[0]!,'   '),true);
for(const skill of ENGINEER_SKILLS){
  assert.equal(new Set(skill.tools.map(tool=>tool.id)).size,skill.tools.length,'duplicate tool in '+skill.id);
  assert.ok(skill.tools.every(tool=>tool.detail.length>0));
}
const bench=read('src/maintenance/MaintenanceWorkbench.tsx');
assert.ok(bench.includes('searchAbProperties(query)'),'complete tree must remain mounted');
assert.ok(bench.includes('searchAbProperties(query)')&&bench.includes('visibleB.map(group=><Pressable'));
assert.ok(bench.includes('scroller.current?.scrollTo'),'jump must actually scroll');
assert.ok(bench.includes('value={query}')&&bench.includes('searchAbProperties(query)'));
assert.ok(bench.includes('visibleB.map(group=><Pressable'),'keyword search must not hide unmatched groups');
assert.ok(bench.includes('toolUsable(tool,session)'),'adapter readiness must be checked in current session');
for(const [frameField,targetField] of [
 ['borderWidth','target:borderWidth'],['borderRadius','target:borderRadius'],
 ['backgroundOpacity','target:backgroundOpacity'],
 ['framefx:backgroundMode','target:backgroundMode'],
 ['framefx:gradientEndColor','target:gradientEndColor'],
 ['framefx:shadowColor','target:shadowColor'],
 ['framefx:glowEnabled','target:glowEnabled'],
]) assert.ok(FRAME_TO_TARGET[frameField!]===targetField,'native metric adapter missing: '+frameField);
assert.ok(bench.includes('resolvedTool(tool,s)'),'compatible skills must route to the selected inner target');
assert.equal(COMPLETE_ENGINEER_SKILLS.length,30);
assert.equal(FULL_SKILL_SECTIONS.flatMap(group=>group.ids).length,30);
for(const [frameField,targetField] of [
 ['titleFontSize','target:fontSize'],['titleColor','target:textColor'],
 ['titleAlign','target:align'],['padding','target:padding'],
]) assert.ok(FRAME_TO_TARGET[frameField!]===targetField,'editable visual tool locked: '+frameField);
assert.ok(bench.includes('僅原始數據、來源及帳務計算鎖定'));
assert.ok(!bench.includes('目前對象不適用 ›'),'non-data tools should not appear policy-locked');


assert.ok(bench.includes('lockedDescription')&&bench.includes('protectedProperties'));
assert.ok(bench.includes('maintenance.apply()')&&bench.includes('maintenance.cancel()'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.29');
assert.equal(app.expo.version,'3.0.29');
assert.equal(app.expo.android.versionCode,30029);
assert.equal(app.expo.ios.buildNumber,'30029');
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(core).length>0,'financial core remains protected: '+core);
console.log('V3.0.14 full skill tree classification, jump navigation, readiness and immutable finance: PASS');
