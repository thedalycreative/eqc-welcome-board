// Preview stories for EventIcon. Each export = one graded card cell.
import { EventIcon } from 'eqc-perth-campus-dashboard';

export const Common = () => (
  <div className="flex flex-wrap items-center gap-5 p-2 text-eqc-green">
    <EventIcon name="CalendarDays" size={32} />
    <EventIcon name="Bell" size={32} />
    <EventIcon name="MapPin" size={32} />
    <EventIcon name="Users" size={32} />
    <EventIcon name="Clock" size={32} />
    <EventIcon name="Trophy" size={32} />
    <EventIcon name="Coffee" size={32} />
    <EventIcon name="GraduationCap" size={32} />
  </div>
);

export const Sizes = () => (
  <div className="flex items-end gap-5 p-2 text-eqc-green">
    <EventIcon name="Bell" size={16} />
    <EventIcon name="Bell" size={24} />
    <EventIcon name="Bell" size={32} />
    <EventIcon name="Bell" size={48} />
  </div>
);

export const Fallback = () => (
  <div className="flex items-center gap-5 p-2 text-eqc-muted">
    <EventIcon name="not-a-real-icon" size={32} />
    <EventIcon name="" size={32} />
  </div>
);
