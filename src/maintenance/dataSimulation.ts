import type {FinancialTone} from './workspaceModel';
// Deliberately ephemeral presentation scenarios. Never serialized in finance or maintenance records.
export const SIMULATION_STATES=['actual','gain','loss','neutral','loading','stale','error'] as const;
export type SimulationState=typeof SIMULATION_STATES[number];
export const SIMULATION_LABELS:Readonly<Record<SimulationState,string>>={
 actual:'真實資料',gain:'上漲／獲利',loss:'下跌／虧損',neutral:'中性',
 loading:'讀取中',stale:'資料延遲',error:'資料失敗',
};
export function simulatedVisualTone(state:SimulationState,actual:FinancialTone):FinancialTone{
 return state==='gain'||state==='loss'||state==='neutral'?state:actual;
}
export function normalizeSimulationState(input:unknown):SimulationState{
 return typeof input==='string'&&SIMULATION_STATES.some(s=>s===input)?input as SimulationState:'actual';
}
