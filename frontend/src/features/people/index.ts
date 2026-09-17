export { ActivePeopleTab } from './components/ActivePeopleTab';
export { WaitlistTab } from './components/WaitlistTab';
export { PeopleTable } from './components/PeopleTable';
export { WaitlistTable } from './components/WaitlistTable';
export { RemovePersonModal } from './components/RemovePersonModal';
export {
  usePeople,
  useWaitlistCount,
  useUpdatePersonRole,
  useApprovePerson,
  useDenyPerson,
  peopleKeys,
} from './hooks/usePeople';
export type { AccessStatus } from './services/people.service';
