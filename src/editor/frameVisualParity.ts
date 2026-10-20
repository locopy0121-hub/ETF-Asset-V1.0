import type {FrameEditorConfig} from './editorModel';
/** Real PageEditorStack and settings preview share identical frame visual props. */
export function frameVisualProps(frame:FrameEditorConfig|undefined){
  return {layout:frame?.layout??'standard',appearance:frame?.appearance??'theme',...(frame?{editorStyle:frame}:{})} as const;
}
