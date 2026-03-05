"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const batchAll_1 = require("./batchAll");
const batch_1 = require("./batch");
const test_utils_1 = require("../../../test-utils");
const setup_1 = require("../../../test-utils/setup");
(0, globals_1.describe)('BatchAllWalkTest', () => {
    let testWalk;
    let utilityEvents;
    let testEvent;
    let testInnerCall;
    const signer = new Uint8Array([0x00]);
    (0, globals_1.beforeEach)(() => {
        testWalk = new test_utils_1.TestWalk([new batchAll_1.BatchAllNode()]);
        utilityEvents = test_utils_1.MockHelpers.createUtilityEvents();
        testEvent = test_utils_1.MockHelpers.createTestEvent();
        testInnerCall = test_utils_1.MockHelpers.createTestCall();
        (0, setup_1.setItemEventsPresent)(true);
    });
    function createBatchAllCall(...innerCalls) {
        return test_utils_1.MockHelpers.createBatchAllCall(innerCalls);
    }
    function itemCompleted() {
        return utilityEvents.ItemCompleted;
    }
    function batchCompleted() {
        return utilityEvents.BatchCompleted;
    }
    function extrinsicSuccess() {
        return utilityEvents.ExtrinsicSuccess;
    }
    function extrinsicFailed() {
        return utilityEvents.ExtrinsicFailed;
    }
    function batchInterrupted(index) {
        return utilityEvents.BatchInterrupted(index);
    }
    (0, globals_1.test)('shouldVisitSucceededSingleBatchedCall', async () => {
        const innerBatchEvents = [testEvent];
        const events = [...innerBatchEvents, itemCompleted(), batchCompleted(), extrinsicSuccess()];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createBatchAllCall(testInnerCall),
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
        const events = [extrinsicFailed()];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createBatchAllCall(testInnerCall),
            events,
            success: false
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
            call: createBatchAllCall(testInnerCall, testInnerCall),
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
    (0, globals_1.test)('shouldVisitFailedMultipleBatchedCalls', async () => {
        const events = [extrinsicFailed()];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createBatchAllCall(testInnerCall, testInnerCall),
            events,
            success: false
        });
        const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 2);
        visits.forEach(visit => {
            (0, globals_1.expect)(visit.success).toBe(false);
            test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
            (0, globals_1.expect)(visit.call).toBe(testInnerCall);
            (0, globals_1.expect)(visit.events).toEqual([]);
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
            call: createBatchAllCall(testInnerCall, createBatchAllCall(testInnerCall, createBatchAllCall(testInnerCall, testInnerCall)), testInnerCall),
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
    (0, globals_1.test)('should handle https://westend.subscan.io/extrinsic/6624751-2', async () => {
        (0, setup_1.setItemEventsPresent)(false);
        const realWorldTestWalk = new test_utils_1.TestWalk([new batch_1.BatchNode(), new batchAll_1.BatchAllNode()]);
        const events = [
            batchInterrupted(0),
            batchCompleted(),
            extrinsicFailed()
        ];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: test_utils_1.MockHelpers.createBatchAllCall([
                test_utils_1.MockHelpers.createBatchCall([
                    test_utils_1.MockHelpers.createBatchAllCall([
                        testInnerCall,
                    ])
                ])
            ]),
            events,
            success: true
        });
        const visit = await realWorldTestWalk.walkSingleIgnoringBranches(extrinsic);
        (0, globals_1.expect)(visit.success).toBe(false);
        (0, globals_1.expect)(visit.call).toBe(testInnerCall);
        (0, globals_1.expect)(visit.events).toEqual([]);
        test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
    });
    // When visiting a batch on the older blocks, where ItemCompleted is not present, we will
    // put all the batch events into each item events to allow further indexing
    (0, globals_1.test)('should handle not defined ItemCompleted', async () => {
        (0, setup_1.setItemEventsPresent)(false);
        const innerBatchEvents = [testEvent];
        const events = [
            ...innerBatchEvents,
            ...innerBatchEvents,
            batchCompleted(),
            ...innerBatchEvents,
            batchCompleted(),
            extrinsicSuccess()
        ];
        const extrinsic = test_utils_1.MockHelpers.createMockExtrinsic({
            signer,
            call: createBatchAllCall(createBatchAllCall(testInnerCall, testInnerCall), testInnerCall),
            events,
            success: true
        });
        const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 3);
        const expected = [
            // For the first two items, which constitutes inner batch, we will see all events from the inner batch
            { success: true, events: [...innerBatchEvents, ...innerBatchEvents] },
            { success: true, events: [...innerBatchEvents, ...innerBatchEvents] },
            // For the 3rd call, we will see all events from the outer batch
            {
                success: true,
                events: [
                    ...innerBatchEvents,
                    ...innerBatchEvents,
                    batchCompleted(),
                    ...innerBatchEvents
                ]
            }
        ];
        visits.forEach((visit, index) => {
            const exp = expected[index];
            (0, globals_1.expect)(visit.success).toBe(exp.success);
            test_utils_1.TestAssertions.expectSignerEquals(visit.origin, signer);
            (0, globals_1.expect)(visit.call).toBe(testInnerCall);
            (0, globals_1.expect)(visit.events).toEqual(exp.events);
        });
    });
});
