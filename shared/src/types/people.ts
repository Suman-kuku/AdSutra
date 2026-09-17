import type { Enums } from './db.js';
import type { PersonDTO } from './index.js';

/**
 * A person as the admin People page sees them. `PersonDTO` is the *caller's own*
 * profile; this adds the fields only an admin list needs, so the two never get
 * confused at a call site.
 */
export interface PersonAdminDTO extends PersonDTO {
  createdAt: string;
  /** pending = on the waitlist, denied = rejected or removed. */
  accessStatus: Enums<'access_status'>;
}
