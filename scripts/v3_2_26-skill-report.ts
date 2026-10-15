import {mkdirSync,writeFileSync} from 'node:fs';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {ADVANCED_ENGINEER_CAPABILITIES,COMPLETE_ENGINEER_SKILLS,FULL_SKILL_CATEGORIES,FULL_SKILL_SECTIONS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {ADAPTER_TARGET_KINDS,auditAdapterMatrix} from '../src/maintenance/skillAdapters';

// Release evidence records declared capabilities and adapter states, not device QA.
const legacy=ENGINEER_SKILLS.flatMap(group=>group.tools);
const matrix=auditAdapterMatrix(legacy);
const summary=completeCatalogAudit();
if(matrix.length!==ADAPTER_TARGET_KINDS.length*legacy.length)throw new Error('Incomplete skill adapter report');
if(summary.duplicateIds.length||summary.emptyCategories.length)throw new Error('Invalid central skill catalog');
const report={
  version:'3.2.26',
  purpose:'Declared central skill inventory and target adapter coverage; NOT Android device validation',
  sections:FULL_SKILL_SECTIONS,
  taxonomy:FULL_SKILL_CATEGORIES,
  advanced:ADVANCED_ENGINEER_CAPABILITIES,
  summary,
  categories:COMPLETE_ENGINEER_SKILLS.map(group=>({
    id:group.id,label:group.label,
    tools:group.tools.map(tool=>({
      id:tool.id,label:tool.label,field:tool.field??null,
      declaredStatus:tool.status,description:tool.detail,
    })),
  })),
  matrix,
  validation:{catalogConsistency:'PASS',nativeDevice:'NOT_TESTED',accountingCore:'NOT_MODIFIED_BY_THIS_REPORT'},
};
mkdirSync('reports',{recursive:true});
writeFileSync('reports/V3.2.26-full-skill-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log('V3.2.26 declared skill matrix generated: '+matrix.length+' target adapters; native device QA remains separate.');
