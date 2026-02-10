"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setItemEventsPresent = setItemEventsPresent;
const mock_helpers_1 = require("./mock-helpers");
// Mock the global api object used in types.ts
const utilityEventTypes = mock_helpers_1.MockHelpers.createUtilityEventTypes();
global.api = {
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
function setItemEventsPresent(present) {
    const utilityObj = global.api.events.utility;
    if (present) {
        utilityObj.ItemCompleted = utilityEventTypes.ItemCompleted;
        utilityObj.ItemFailed = utilityEventTypes.ItemFailed;
    }
    else {
        utilityObj.ItemCompleted = undefined;
        utilityObj.ItemFailed = undefined;
    }
}
