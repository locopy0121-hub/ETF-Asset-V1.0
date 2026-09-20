export type RelationshipLayer = 'A' | 'B' | 'C' | 'D' | 'E';

export const NEXT_RELATIONSHIP_LAYER: Readonly<Record<RelationshipLayer, RelationshipLayer | null>> = {
  A: 'B',
  B: 'C',
  C: 'D',
  D: 'E',
  E: null,
};

export function canControlAdjacentLayer(source: RelationshipLayer, target: RelationshipLayer) {
  return NEXT_RELATIONSHIP_LAYER[source] === target;
}

export function assertAdjacentRelationship(source: RelationshipLayer, target: RelationshipLayer) {
  if (!canControlAdjacentLayer(source, target)) {
    throw new Error(`Invalid relationship: ${source} cannot directly control ${target}`);
  }
}
