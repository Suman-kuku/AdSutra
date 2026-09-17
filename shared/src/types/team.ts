import type { PersonDTO } from './index.js';

/**
 * A team, as the API exposes it. Members come embedded because every screen
 * that lists a team also shows who is on it — a second round trip per team
 * would be pure waste.
 */
export interface TeamDTO {
  id: string;
  name: string;
  members: PersonDTO[];
  createdBy: string | null;
  createdAt: string;
}
