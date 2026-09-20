export const TF_ASSET_EDITOR_CONTRACT = Object.freeze({
  origin: 'tf-asset-native',
  allowsLegacyV5: false,
  relationshipPolicy: 'adjacent-only',
} as const);

export type TfAssetEditorContract = typeof TF_ASSET_EDITOR_CONTRACT;
