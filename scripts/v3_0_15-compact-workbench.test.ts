import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPLETE_ENGINEER_SKILLS,FULL_SKILL_SECTIONS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {skillMatches} from '../src/maintenance/skillTree';

const wb=readFileSync('src/maintenance/MaintenanceWorkbench.tsx','utf8');
const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const ci=readFileSync('.github/workflows/ci.yml','utf8');
const sections=FULL_SKILL_SECTIONS;
const audit=completeCatalogAudit();

// At rest, only six entry cards render; each drill-down mounts ONE of 30 classes.
assert.equal(sections.length,6);
assert.equal(new Set(sections.flatMap(section=>[...section.ids])).size,30);
assert.equal(COMPLETE_ENGINEER_SKILLS.length,30);
assert.equal(COMPLETE_ENGINEER_SKILLS.flatMap(category=>category.tools).length,184);
assert.equal(audit.existing,169);
assert.equal(audit.advanced,12);
assert.equal(audit.unregistered,3);
assert.ok(sections.every(section=>section.ids.length===5));
assert.ok(wb.includes('FULL_SKILL_SECTIONS.map(section=><Pressable'),'landing screen renders only six entrances');
assert.ok(wb.includes('currentSection.ids.map(id=>'),'second screen shows one section of five categories');
assert.ok(wb.includes('selectedSkill.tools.map(tool=>'),'third screen shows tools from only the selected category');
assert.ok(!wb.includes('displaySkills.map(skillItem=><View'),'all 30 categories must NOT be stacked on mobile');
assert.ok(wb.includes('skillQuery.trim()?'),'search results are explicitly scoped to an entered query');
assert.ok(wb.includes('matchingSkills.map(skillItem=><Pressable'),'search preserves direct skill navigation');
for(const term of ['漸層','文字','Widget','AI']){
 assert.ok(COMPLETE_ENGINEER_SKILLS.some(category=>skillMatches(category,term)),
   'all known skill families must remain searchable: '+term);
}
for(const section of sections){
 assert.ok(section.ids.every(id=>COMPLETE_ENGINEER_SKILLS.some(category=>category.id===id)),
   'compact navigation cannot delete catalog entries: '+section.id);
}
assert.ok(wb.includes('showProtection?')&&wb.includes('showInspector?')&&wb.includes('showStats?'),
  'verbose protection, inspection and audit diagnostics must be collapsed by default');
assert.ok(wb.includes('const [showProtection,setShowProtection]=useState(false)'));
assert.ok(wb.includes('const [showInspector,setShowInspector]=useState(false)'));
assert.ok(wb.includes('const [showStats,setShowStats]=useState(false)'));
assert.ok(wb.includes('const [activeSection,setActiveSection]=useState<string|null>(null)'));
assert.ok(wb.includes('const [openSkill,setOpenSkill]=useState<string|null>(null)'));
assert.ok(wb.includes('const [openTool,setOpenTool]=useState<string|null>(null)'));
assert.ok(wb.includes('setOpenTool(null)'),'switching selection closes the previous tool');
assert.ok(wb.includes('value={session.syncSameKind}')&&wb.includes('maintenance.setSyncScope(scope)'),
  'same-kind synchronization retains explicit frame/page/app scope');
assert.ok(wb.includes('maintenance.apply()')&&wb.includes('maintenance.cancel()'),
  'preview remains transactional with a persistent bottom action bar');
assert.ok(wb.includes('ref={skillScroller}')&&wb.includes('goTop()'),
  'changing levels returns the scroll position to the top');
assert.ok(wb.includes('ScopedToolDetails tool={tool} instance={instance}'),
  'native adapter routing and original editor are unchanged');
assert.ok(!wb.includes('setActiveSection(section.id);setOpenSkill(section.id)'),
  'selecting a section must not skip the category level');
assert.equal(app.expo.version,'3.0.15');
assert.equal(app.expo.android.versionCode,30015);
assert.equal(app.expo.ios.buildNumber,'30015');
assert.equal(pkg.version,'3.0.15');
assert.ok(ci.includes("30015"),'new QA APK must have an incremented Android versionCode');
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md']){
 assert.ok(readFileSync(core,'utf8').length>0,'locked financial core must remain present: '+core);
}
console.log('V3.0.15 compact navigation: 6 > 5 > 1 progressive disclosure; all 184 skills retained: PASS');
console.log('Protection, inspector, status and same-kind sync remain available on demand: PASS');
