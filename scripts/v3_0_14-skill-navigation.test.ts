import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENGINEER_SKILLS,ENGINEER_SKILL_SECTIONS,skillCounts,skillMatches} from '../src/maintenance/skillTree';
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
assert.ok(bench.includes('const displaySkills=ENGINEER_SKILLS;'),'complete tree must remain mounted');
assert.ok(bench.includes('ENGINEER_SKILL_SECTIONS.map')&&bench.includes('jumpToSkill(id)'));
assert.ok(bench.includes('skillScroller.current?.scrollTo'),'jump must actually scroll');
assert.ok(bench.includes('value={skillQuery}')&&bench.includes('skillMatches(skillItem,skillQuery)'));
assert.ok(bench.includes('displaySkills.map(skillItem=>'),'keyword search must not hide unmatched groups');
assert.ok(bench.includes('toolUsable(tool,session)'),'adapter readiness must be checked in current session');
for(const [frameField,targetField] of [
 ['borderWidth','target:borderWidth'],['borderRadius','target:borderRadius'],
 ['backgroundOpacity','target:backgroundOpacity'],
 ['framefx:backgroundMode','target:backgroundMode'],
 ['framefx:gradientEndColor','target:gradientEndColor'],
 ['framefx:shadowColor','target:shadowColor'],
 ['framefx:glowEnabled','target:glowEnabled'],
]) assert.ok(bench.includes("'"+frameField+"':'"+targetField+"'"),'native metric adapter missing: '+frameField);
assert.ok(bench.includes('resolvedTool(tool,s)'),'compatible skills must route to the selected inner target');

assert.ok(bench.includes('lockedDescription')&&bench.includes('protectedProperties'));
assert.ok(bench.includes('maintenance.apply()')&&bench.includes('maintenance.cancel()'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.14');
assert.equal(app.expo.version,'3.0.14');
assert.equal(app.expo.android.versionCode,30014);
assert.equal(app.expo.ios.buildNumber,'30014');
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(core).length>0,'financial core remains protected: '+core);
console.log('V3.0.14 full skill tree classification, jump navigation, readiness and immutable finance: PASS');
