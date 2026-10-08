import {PAGE_FRAMES} from './frameRegistry';

// Settings is protected: V4.0.15 editing expansion does not add frames to it.
export const EDITOR_FRAMES: typeof PAGE_FRAMES={...PAGE_FRAMES};
