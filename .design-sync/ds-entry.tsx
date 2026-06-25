// Design-system entry for claude.ai/design (design-sync).
//
// This app has no library build, so this module defines the exact reusable
// surface synced to Claude Design. esbuild bundles it into an IIFE assigning
// each export to window.<globalName>. Keep this in sync with
// .design-sync/config.json `componentSrcMap`. The build/re-sync commands point
// `--entry` at this file (see .design-sync/NOTES.md).
export { default as ConfirmDialog } from '../src/components/ConfirmDialog';
export { default as IconPicker } from '../src/components/IconPicker';
export { EventIcon } from '../src/lib/eventIcons';
