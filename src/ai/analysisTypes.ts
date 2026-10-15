import type {LocalEtfComponent,LocalEtfMeta} from '../native/TfAssetNativeBridge';

export type AiHoldingProjection=Readonly<{
  symbol:string;
  name:string;
  shares:number;
  avgCost:number;
  marketPrice:number;
  marketValue:number;
  pnl:number;
  roi:number;
  portfolioWeight:number; // percent, 0..100
}>;

export type EtfResearchCoverage=Readonly<{
  symbol:string;
  componentRows:number;
  metaAvailable:boolean;
  effectiveDate:string|null;
  source:string|null;
}>;

export type IndustryExposure=Readonly<{
  industry:string;
  weight:number; // portfolio percent
}>;

export type PairwiseOverlap=Readonly<{
  heldSymbol:string;
  targetSymbol:string;
  overlapPercent:number;
}>;

export type WhatIfAnalysis=Readonly<{
  investmentAmount:number;
  targetWeightAfter:number;
  duplicateShareOfNewEtf:number;
  duplicateCapitalAmount:number;
  industryBefore:readonly IndustryExposure[];
  industryAfter:readonly IndustryExposure[];
}>;

export type AnalysisContext=Readonly<{
  generatedAt:string;
  targetSymbol:string|null;
  isCurrentlyHeld:boolean|null;
  portfolio:Readonly<{
    totalMarketValue:number;
    holdingCount:number;
    holdings:readonly AiHoldingProjection[];
  }>;
  target:Readonly<{
    meta:LocalEtfMeta|null;
    components:readonly LocalEtfComponent[];
  }>|null;
  researchCoverage:readonly EtfResearchCoverage[];
  industryExposure:readonly IndustryExposure[];
  pairwiseOverlap:readonly PairwiseOverlap[];
  whatIf:WhatIfAnalysis|null;
  warnings:readonly string[];
}>;
