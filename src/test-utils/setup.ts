import { MockHelpers } from './mock-helpers';

// Mock the global api object used in types.ts
const utilityEventTypes = MockHelpers.createUtilityEventTypes();
const multisigEventTypes = {
  MultisigExecuted: MockHelpers.createMockEventType('multisig', 'MultisigExecuted'),
  MultisigApproval: MockHelpers.createMockEventType('multisig', 'MultisigApproval'),
  NewMultisig: MockHelpers.createMockEventType('multisig', 'NewMultisig'),
};

(global as any).api = {
  events: {
    utility: {
      BatchCompleted: utilityEventTypes.BatchCompleted,
      BatchCompletedWithErrors: utilityEventTypes.BatchCompletedWithErrors,
      BatchInterrupted: utilityEventTypes.BatchInterrupted,
      ItemCompleted: utilityEventTypes.ItemCompleted,
      ItemFailed: utilityEventTypes.ItemFailed,
    },
    multisig: {
      MultisigExecuted: multisigEventTypes.MultisigExecuted,
      MultisigApproval: multisigEventTypes.MultisigApproval,
      NewMultisig: multisigEventTypes.NewMultisig,
    },
  },
  registry: {
    chainSS58: 42,
  },
};

export function setItemEventsPresent(present: boolean) {
  const utilityObj = (global as any).api.events.utility;

  if (present) {
    utilityObj.ItemCompleted = utilityEventTypes.ItemCompleted;
    utilityObj.ItemFailed = utilityEventTypes.ItemFailed;
  } else {
    utilityObj.ItemCompleted = undefined;
    utilityObj.ItemFailed = undefined;
  }
}
