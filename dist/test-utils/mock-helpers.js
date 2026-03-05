"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHelpers = void 0;
class MockHelpers {
    static createMockCall(options) {
        const mockCall = {
            section: options.section,
            method: options.method,
            args: options.args || [],
            toHuman: () => ({ section: options.section, method: options.method }),
            toString: () => `${options.section}.${options.method}`
        };
        return mockCall;
    }
    static createMockEvent(options) {
        const mockEvent = {
            section: options.section,
            method: options.method,
            data: options.args || [],
            toHuman: () => ({ section: options.section, method: options.method }),
            toString: () => `${options.section}.${options.method}`
        };
        return mockEvent;
    }
    static createMockSubstrateEvent(event) {
        return {
            event,
            phase: { isApplyExtrinsic: true, asApplyExtrinsic: 0 },
            topics: []
        };
    }
    static createMockExtrinsic(options) {
        const mockExtrinsic = {
            extrinsic: {
                method: options.call,
                signer: {
                    toString: () => MockHelpers.signerToString(options.signer)
                }
            },
            events: options.events.map(event => MockHelpers.createMockSubstrateEvent(event)),
            success: options.success !== undefined ? options.success : true,
            block: {
                block: { header: { number: { toNumber: () => 1000 } } }
            },
            idx: 0
        };
        return mockExtrinsic;
    }
    static signerToString(signer) {
        return typeof signer === 'string' ? signer : Array.from(signer).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Create mock event types that can be used for event matching
    static createMockEventType(section, method) {
        return {
            is: (event) => event.section === section && event.method === method
        };
    }
    static createUtilityEvents() {
        return {
            ItemCompleted: MockHelpers.createMockEvent({
                section: 'utility',
                method: 'ItemCompleted'
            }),
            BatchCompleted: MockHelpers.createMockEvent({
                section: 'utility',
                method: 'BatchCompleted'
            }),
            BatchCompletedWithErrors: MockHelpers.createMockEvent({
                section: 'utility',
                method: 'BatchCompletedWithErrors'
            }),
            BatchInterrupted: (index) => MockHelpers.createMockEvent({
                section: 'utility',
                method: 'BatchInterrupted',
                args: [{ toNumber: () => index }] // Mock failed index
            }),
            ItemFailed: MockHelpers.createMockEvent({
                section: 'utility',
                method: 'ItemFailed'
            }),
            ExtrinsicSuccess: MockHelpers.createMockEvent({
                section: 'system',
                method: 'ExtrinsicSuccess'
            }),
            ExtrinsicFailed: MockHelpers.createMockEvent({
                section: 'system',
                method: 'ExtrinsicFailed'
            })
        };
    }
    static createUtilityEventTypes() {
        return {
            ItemCompleted: MockHelpers.createMockEventType('utility', 'ItemCompleted'),
            BatchCompleted: MockHelpers.createMockEventType('utility', 'BatchCompleted'),
            BatchCompletedWithErrors: MockHelpers.createMockEventType('utility', 'BatchCompletedWithErrors'),
            BatchInterrupted: MockHelpers.createMockEventType('utility', 'BatchInterrupted'),
            ItemFailed: MockHelpers.createMockEventType('utility', 'ItemFailed'),
            ExtrinsicSuccess: MockHelpers.createMockEventType('system', 'ExtrinsicSuccess'),
            ExtrinsicFailed: MockHelpers.createMockEventType('system', 'ExtrinsicFailed')
        };
    }
    static createBatchAllCall(innerCalls) {
        return MockHelpers.createMockCall({
            section: 'utility',
            method: 'batchAll',
            args: [innerCalls]
        });
    }
    static createBatchCall(innerCalls) {
        return MockHelpers.createMockCall({
            section: 'utility',
            method: 'batch',
            args: [innerCalls]
        });
    }
    static createForceBatchCall(innerCalls) {
        return MockHelpers.createMockCall({
            section: 'utility',
            method: 'forceBatch',
            args: [innerCalls]
        });
    }
    static createTestCall(section = 'test', method = 'testCall') {
        return MockHelpers.createMockCall({
            section,
            method,
            args: []
        });
    }
    static createTestEvent(section = 'test', method = 'TestEvent') {
        return MockHelpers.createMockEvent({
            section,
            method,
            args: []
        });
    }
}
exports.MockHelpers = MockHelpers;
