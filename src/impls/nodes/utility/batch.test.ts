import { describe, test, beforeEach, expect } from '@jest/globals';
import { BatchNode } from './batch';
import { TestWalk, MockHelpers, TestAssertions } from '../../../test-utils';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { AnyEvent } from '../../../interfaces';
import { setItemEventsPresent } from '../../../test-utils/setup';

describe('BatchWalkTest', () => {
  let testWalk: TestWalk;
  let utilityEvents: ReturnType<typeof MockHelpers.createUtilityEvents>;
  let testEvent: AnyEvent;
  let testInnerCall: CallBase<AnyTuple>;
  const signer = new Uint8Array([0x00]);

  beforeEach(() => {
    testWalk = new TestWalk([new BatchNode()]);
    utilityEvents = MockHelpers.createUtilityEvents();
    testEvent = MockHelpers.createTestEvent();
    testInnerCall = MockHelpers.createTestCall();
    setItemEventsPresent(true)
  });

  function createBatchCall(...innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
    return MockHelpers.createBatchCall(innerCalls);
  }

  function itemCompleted(): AnyEvent {
    return utilityEvents.ItemCompleted;
  }

  function batchInterrupted(index: number): AnyEvent {
    return utilityEvents.BatchInterrupted(index);
  }

  function batchCompleted(): AnyEvent {
    return utilityEvents.BatchCompleted;
  }

  function extrinsicSuccess(): AnyEvent {
    return utilityEvents.ExtrinsicSuccess;
  }

  test('shouldVisitSucceededSingleBatchedCall', async () => {
    const innerBatchEvents = [testEvent];
    const events = [...innerBatchEvents, itemCompleted(), batchCompleted(), extrinsicSuccess()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall),
      events,
      success: true
    });

    const visit = await testWalk.walkSingleIgnoringBranches(extrinsic);

    expect(visit.success).toBe(true);
    TestAssertions.expectSignerEquals(visit.origin, signer);
    expect(visit.call).toBe(testInnerCall);
    expect(visit.events).toEqual(innerBatchEvents);
  });

  test('shouldVisitFailedSingleBatchedCall', async () => {
    const events = [batchInterrupted(0), extrinsicSuccess()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall),
      events,
      success: true
    });

    const visit = await testWalk.walkSingleIgnoringBranches(extrinsic);

    expect(visit.success).toBe(false);
    TestAssertions.expectSignerEquals(visit.origin, signer);
    expect(visit.call).toBe(testInnerCall);
    expect(visit.events).toEqual([]);
  });

  test('shouldVisitSucceededMultipleBatchedCalls', async () => {
    const innerBatchEvents = [testEvent];
    const events = [
      ...innerBatchEvents,
      itemCompleted(),

      ...innerBatchEvents,
      itemCompleted(),

      batchCompleted(),
      extrinsicSuccess()
    ];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall, testInnerCall),
      events,
      success: true
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 2);

    visits.forEach(visit => {
      expect(visit.success).toBe(true);
      TestAssertions.expectSignerEquals(visit.origin, signer);
      expect(visit.call).toBe(testInnerCall);
      expect(visit.events).toEqual(innerBatchEvents);
    });
  });

  test('shouldVisitPartiallyFailedBatchCalls', async () => {
    const innerBatchEvents = [testEvent];
    const events = [
      ...innerBatchEvents,
      itemCompleted(),

      batchInterrupted(1),

      extrinsicSuccess()
    ];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall, testInnerCall),
      events,
      success: true
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 2);

    const successItem = visits[0]!
    expect(successItem.success).toBe(true);
    TestAssertions.expectSignerEquals(successItem.origin, signer);
    expect(successItem.call).toBe(testInnerCall);
    expect(successItem.events).toEqual(innerBatchEvents);

    const failedItem = visits[1]!
    expect(failedItem.success).toBe(false);
    TestAssertions.expectSignerEquals(failedItem.origin, signer);
    expect(failedItem.call).toBe(testInnerCall);
    expect(failedItem.events).toEqual([]);
  });

  test('shouldVisitNestedBatches', async () => {
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

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(
        testInnerCall,
        createBatchCall(
          testInnerCall,
          createBatchCall(
            testInnerCall,
            testInnerCall
          )
        ),
        testInnerCall
      ),
      events,
      success: true
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 5);

    visits.forEach(visit => {
      expect(visit.success).toBe(true);
      TestAssertions.expectSignerEquals(visit.origin, signer);
      expect(visit.call).toBe(testInnerCall);
      expect(visit.events).toEqual(innerBatchEvents);
    });
  });

  // Based on https://westend.subscan.io/extrinsic/3788316-1
  // When visiting a batch on the older blocks, where ItemCompleted is not present, we will
  // put all the batch events into each item events to allow further indexing
  test('should handle not defined ItemCompleted', async () => {
    setItemEventsPresent(false)

    const innerBatchEvents = [testEvent];

    const events = [
        ...innerBatchEvents,
        ...innerBatchEvents,
      batchCompleted(),
      ...innerBatchEvents,
      batchCompleted(),
      extrinsicSuccess()
    ];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(
        createBatchCall(
          testInnerCall,
          testInnerCall
        ),
        testInnerCall
      ),
      events,
      success: true
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 3);

    const expected: Array<{ success: boolean; events: AnyEvent[] }> = [
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
      const exp = expected[index]!;
      expect(visit.success).toBe(exp.success);
      TestAssertions.expectSignerEquals(visit.origin, signer);
      expect(visit.call).toBe(testInnerCall);
      expect(visit.events).toEqual(exp.events);
    });
  });
});