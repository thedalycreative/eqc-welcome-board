// Preview stories for IconPicker. Each export = one graded card cell.
// The open grid is an interaction state (internal open-on-click), so these
// show the trigger button in its various configurations.
import { IconPicker } from 'eqc-perth-campus-dashboard';

const noop = () => {};

export const Empty = () => (
  <IconPicker value="" onChange={noop} />
);

export const WithLabel = () => (
  <IconPicker value="" onChange={noop} triggerLabel="Event icon" />
);

export const Selected = () => (
  <IconPicker value="CalendarDays" onChange={noop} triggerLabel="Event icon" />
);

export const CustomAccent = () => (
  <IconPicker value="Trophy" onChange={noop} accentColor="#062016" />
);
