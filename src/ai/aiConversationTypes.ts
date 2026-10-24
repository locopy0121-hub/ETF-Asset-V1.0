import type {ResolvedSecurity} from '../market/securityResolver';

export type AiSessionTopic='PORTFOLIO'|'RESEARCH'|'MARKET'|'SIMULATION'|'GENERAL';

export type AiSessionContext=Readonly<{
  activeSecurity?:ResolvedSecurity;
  activeTopic?:AiSessionTopic;
}>;

export const EMPTY_AI_SESSION_CONTEXT:AiSessionContext={activeTopic:'GENERAL'};
