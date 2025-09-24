import { MockHelpers } from './mock-helpers';

// Mock the global api object used in types.ts
const utilityEventTypes = MockHelpers.createUtilityEventTypes();

(global as any).api = {
  events: {
    utility: {
      BatchCompleted: utilityEventTypes.BatchCompleted,
      BatchCompletedWithErrors: utilityEventTypes.BatchCompletedWithErrors,
      BatchInterrupted: utilityEventTypes.BatchInterrupted,
      ItemCompleted: utilityEventTypes.ItemCompleted,
      ItemFailed: utilityEventTypes.ItemFailed
    }
  }
};

export function setItemEventsPresent(present: boolean) {
  const utilityObj = (global as any).api.events.utility;

  if (present) {
    utilityObj.ItemCompleted = utilityEventTypes.ItemCompleted
    utilityObj.ItemFailed = utilityEventTypes.ItemFailed
  } else {
    utilityObj.ItemCompleted = undefined
    utilityObj.ItemFailed = undefined
  }
}