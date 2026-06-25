// Preview stories for ConfirmDialog. Each export = one graded card cell.
// ConfirmDialog renders a `fixed inset-0` backdrop. The preview harness wraps
// the single story in a `transform: translateZ(0)` box, which becomes the
// containing block for that fixed backdrop — so we give each story an in-flow
// sized Frame, otherwise the backdrop collapses to 0 height and the dialog
// header clips above the card. Shown one story per card
// (cfg.overrides.ConfirmDialog: { cardMode: "single", primaryStory: "Danger" }).
import { ConfirmDialog } from 'eqc-perth-campus-dashboard';

const noop = () => {};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: 460, position: 'relative' }}>{children}</div>
);

export const Danger = () => (
  <Frame>
    <ConfirmDialog
      open
      tone="danger"
      title="Delete this trainer?"
      body="This removes them from the sign-on log and can't be undone."
      confirmLabel="Delete"
      cancelLabel="Keep"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);

export const Warning = () => (
  <Frame>
    <ConfirmDialog
      open
      tone="warning"
      title="Discard unsaved changes?"
      body="You've edited this event but haven't saved. Leaving now loses your changes."
      confirmLabel="Discard"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);

export const Info = () => (
  <Frame>
    <ConfirmDialog
      open
      tone="info"
      title="Publish carousel?"
      body="The lobby display will update for everyone within a few seconds."
      confirmLabel="Publish"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);

export const ThreeWay = () => (
  <Frame>
    <ConfirmDialog
      open
      tone="warning"
      title="You have unsaved changes"
      body="Save before leaving, or discard them?"
      confirmLabel="Discard"
      cancelLabel="Cancel"
      altLabel="Save changes"
      onAlt={noop}
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);
