"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setItemEventsPresent = setItemEventsPresent;
const mock_helpers_1 = require("./mock-helpers");
// Mock the global api object used in types.ts
const utilityEventTypes = mock_helpers_1.MockHelpers.createUtilityEventTypes();
const multisigEventTypes = {
    MultisigExecuted: mock_helpers_1.MockHelpers.createMockEventType('multisig', 'MultisigExecuted'),
    MultisigApproval: mock_helpers_1.MockHelpers.createMockEventType('multisig', 'MultisigApproval'),
    NewMultisig: mock_helpers_1.MockHelpers.createMockEventType('multisig', 'NewMultisig'),
};
global.api = {
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
