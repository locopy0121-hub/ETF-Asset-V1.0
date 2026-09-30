import {localAnswerFromCoreTools,type CoreAiToolPlan} from './coreAiToolRegistry';
import {localAnswerFromEvidence} from './aiIntelligenceMiddleware';
import type {AiEvidencePackage} from './intelligenceTypes';

export type AiResponseRoute='LOCAL_CORE'|'LOCAL_EVIDENCE'|'GEMINI';

export type AiResponseDecision=Readonly<{
  route:AiResponseRoute;
  text:string|null;
  reason:string;
}>;

const LOCAL_EVIDENCE_RECIPES=new Set<AiEvidencePackage['recipeId']>([
  'MARKET_QUOTE',
  'MARKET_PERFORMANCE',
  'MARKET_NEWS',
  'SECURITY_PROFILE',
  'ETF_COMPARE',
  'PORTFOLIO_CONTEXT',
]);

/**
 * Response arbitration is intentionally App-first for deterministic financial facts.
 *
 * Gemini remains available for general conversation, open-ended explanation and
 * scenario reasoning, but it is no longer the availability gate for answers that
 * TF Asset can produce from its verified Tool/Evidence layer.
 */
export function decideAiResponse(
  toolPlan:CoreAiToolPlan,
  evidence:AiEvidencePackage,
):AiResponseDecision{
  const core=localAnswerFromCoreTools(toolPlan);
  if(core){
    return {
      route:'LOCAL_CORE',
      text:core,
      reason:'Canonical App/Market Tool result is sufficient; do not block on Gemini.',
    };
  }

  if(LOCAL_EVIDENCE_RECIPES.has(evidence.recipeId)){
    const local=localAnswerFromEvidence(evidence);
    if(local){
      return {
        route:'LOCAL_EVIDENCE',
        text:local,
        reason:'Validated Evidence package can answer deterministically; Gemini is optional enrichment.',
      };
    }
  }

  return {
    route:'GEMINI',
    text:null,
    reason:'Question requires general/open-ended language reasoning beyond current deterministic responder.',
  };
}
