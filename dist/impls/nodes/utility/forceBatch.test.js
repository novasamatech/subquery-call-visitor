"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const forceBatch_1 = require("./forceBatch");
const test_utils_1 = require("../../../test-utils");
const setup_1 = require("../../../test-utils/setup");
(0, globals_1.describe)('ForceBatchWalkTest', () => {
    let testWalk;
    let utilityEvents;
    let testEvent;
    let testInnerCall;
    const signer = new Uint8Array([0x00]);
    (0, globals_1.beforeEach)(() => {
        testWalk = new test_utils_1.TestWalk([new forceBatch_1.ForceBatchNode()]);
        utilityEvents = test_utils_1.MockHelpers.createUtilityEvents();
        testEvent = test_utils_1.MockHelpers.createTestEvent();
        testInnerCall = test_utils_1.MockHelpers.createTestCall();
        (0, setup_1.setItemEventsPresent)(true);
    });
    function createForceBatchCall(...innerCalls) {
        return test_utils_1.MockHelpers.createForceBatchCall(innerCalls);
    }
    function itemCompleted() {
        return utilityEvents.ItemCompleted;
    }
    function itemFailed() {
        return utilityEvents.ItemFailed;
    }
    function batchCompleted() {
        return utilityEvents.BatchCompleted;
    }
    function batchCompletedWithErrors() {
        return utilityEvents.BatchCompletedWithErrors;
    }
    function extrinsicSuccess() {
        return utilityEvents.ExtrinsicSuccess;
    }
    (0, globals_1.test)('shouldVisitSucceededSingleBatchedCall', async () => {
        const innerBatchEvents = [testEvent];
        const events = [...innerBatchEvents, itemCompleted(), batchCompleted(), extrinsicSuccess()];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createForceBatchCall(testInnerCall),
            events,
            success: true
        });
        const visit = await testWalk.walkSingleIgnoringBranches(extrinsic);
        (0, globals_1.expect)(visit.success).toBe(true);
        test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
        (0, globals_1.expect)(visit.call).toBe(testInnerCall);
        (0, globals_1.expect)(visit.events).toEqual(innerBatchEvents);
    });
    (0, globals_1.test)('shouldVisitFailedSingleBatchedCall', async () => {
        const innerBatchEvents = [testEvent];
        const events = [...innerBatchEvents, itemFailed(), batchCompletedWithErrors(), extrinsicSuccess()];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createForceBatchCall(testInnerCall),
            events,
            success: true
        });
        const visit = await testWalk.walkSingleIgnoringBranches(extrinsic);
        (0, globals_1.expect)(visit.success).toBe(false);
        test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
        (0, globals_1.expect)(visit.call).toBe(testInnerCall);
        (0, globals_1.expect)(visit.events).toEqual([]);
    });
    (0, globals_1.test)('shouldVisitSucceededMultipleBatchedCalls', async () => {
        const innerBatchEvents = [testEvent];
        const events = [
            ...innerBatchEvents,
            itemCompleted(),
            ...innerBatchEvents,
            itemCompleted(),
            batchCompleted(),
            extrinsicSuccess()
        ];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createForceBatchCall(testInnerCall, testInnerCall),
            events,
            success: true
        });
        const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 2);
        visits.forEach(visit => {
            (0, globals_1.expect)(visit.success).toBe(true);
            test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
            (0, globals_1.expect)(visit.call).toBe(testInnerCall);
            (0, globals_1.expect)(visit.events).toEqual(innerBatchEvents);
        });
    });
    (0, globals_1.test)('shouldVisitMixedMultipleBatchedCalls', async () => {
        const innerBatchEvents = [testEvent];
        const events = [
            ...innerBatchEvents,
            itemCompleted(),
            itemFailed(),
            ...innerBatchEvents,
            itemCompleted(),
            batchCompletedWithErrors(),
            extrinsicSuccess()
        ];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createForceBatchCall(testInnerCall, testInnerCall, testInnerCall),
            events,
            success: true
        });
        const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 3);
        const expected = [
            { success: true, events: innerBatchEvents },
            { success: false, events: [] },
            { success: true, events: innerBatchEvents }
        ];
        visits.forEach((visit, index) => {
            const exp = expected[index];
            (0, globals_1.expect)(visit.success).toBe(exp.success);
            test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
            (0, globals_1.expect)(visit.call).toBe(testInnerCall);
            (0, globals_1.expect)(visit.events).toEqual(exp.events);
        });
    });
    (0, globals_1.test)('shouldVisitNestedBatches', async () => {
        const innerBatchEvents = [testEvent];
        const events = [
            // first level batch starts
            ...innerBatchEvents,
            itemCompleted(),
            // second level batch
            ...innerBatchEvents,
            itemCompleted(),
            // third level batch
            ...innerBatchEvents,
            itemCompleted(),
            ...innerBatchEvents,
            itemCompleted(),
            batchCompleted(), // end third level
            itemCompleted(), // end second level batch item
            batchCompleted(), // end second level
            itemCompleted(), // end first level batch item
            ...innerBatchEvents,
            itemCompleted(),
            // first level batch ends
            batchCompleted(),
            extrinsicSuccess()
        ];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createForceBatchCall(testInnerCall, createForceBatchCall(testInnerCall, createForceBatchCall(testInnerCall, testInnerCall)), testInnerCall),
            events,
            success: true
        });
        const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 5);
        visits.forEach(visit => {
            (0, globals_1.expect)(visit.success).toBe(true);
            test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
            (0, globals_1.expect)(visit.call).toBe(testInnerCall);
            (0, globals_1.expect)(visit.events).toEqual(innerBatchEvents);
        });
    });
});
