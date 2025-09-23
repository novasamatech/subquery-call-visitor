import { MockHelpers } from './mock-helpers';

// Mock the global api object used in types.ts
const utilityEventTypes = MockHelpers.createUtilityEventTypes();

(global as any).api = {
  events: {
    utility: {
      BatchCompleted: utilityEventTypes.BatchCompleted,
      BatchCompletedWithErrors: utilityEventTypes.BatchCompleted,
      BatchInterrupted: utilityEventTypes.BatchCompleted,
      ItemCompleted: utilityEventTypes.ItemCompleted,
      ItemFailed: utilityEventTypes.ItemFailed
    }
  }
};