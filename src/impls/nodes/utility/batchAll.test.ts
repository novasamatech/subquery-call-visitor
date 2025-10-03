import { describe, test, beforeEach, expect } from '@jest/globals';
import { BatchAllNode } from './batchAll';
import { BatchNode } from './batch';
import { TestWalk, MockHelpers, TestAssertions } from '../../../test-utils';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { AnyEvent } from '../../../interfaces';
import { setItemEventsPresent } from '../../../test-utils/setup';

describe('BatchAllWalkTest', () => {
  let testWalk: TestWalk;
  let utilityEvents: ReturnType<typeof MockHelpers.createUtilityEvents>;
  let testEvent: AnyEvent;
  let testInnerCall: CallBase<AnyTuple>;
  const signer = new Uint8Array([0x00]);

  beforeEach(() => {
    testWalk = new TestWalk([new BatchAllNode()]);
    utilityEvents = MockHelpers.createUtilityEvents();
    testEvent = MockHelpers.createTestEvent();
    testInnerCall = MockHelpers.createTestCall();
    setItemEventsPresent(true)
  });

  function createBatchAllCall(...innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
    return MockHelpers.createBatchAllCall(innerCalls);
  }

  function itemCompleted(): AnyEvent {
    return utilityEvents.ItemCompleted;
  }

  function batchCompleted(): AnyEvent {
    return utilityEvents.BatchCompleted;
  }

  function extrinsicSuccess(): AnyEvent {
    return utilityEvents.ExtrinsicSuccess;
  }

  function extrinsicFailed(): AnyEvent {
    return utilityEvents.ExtrinsicFailed;
  }

  function batchInterrupted(index: number): AnyEvent {
    return utilityEvents.BatchInterrupted(index);
  }

  test('shouldVisitSucceededSingleBatchedCall', async () => {
    const innerBatchEvents = [testEvent];
    const events = [...innerBatchEvents, itemCompleted(), batchCompleted(), extrinsicSuccess()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchAllCall(testInnerCall),
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
    const events = [extrinsicFailed()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchAllCall(testInnerCall),
      events,
      success: false
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
      call: createBatchAllCall(testInnerCall, testInnerCall),
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

  test('shouldVisitFailedMultipleBatchedCalls', async () => {
    const events = [extrinsicFailed()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchAllCall(testInnerCall, testInnerCall),
      events,
      success: false
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 2);

    visits.forEach(visit => {
      expect(visit.success).toBe(false);
      TestAssertions.expectSignerEquals(visit.origin, signer);
      expect(visit.call).toBe(testInnerCall);
      expect(visit.events).toEqual([]);
    });
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
      call: createBatchAllCall(
        testInnerCall,
        createBatchAllCall(
          testInnerCall,
          createBatchAllCall(
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

  test('should handle https://westend.subscan.io/extrinsic/6624751-2', async () => {
    setItemEventsPresent(false)

    const realWorldTestWalk = new TestWalk([new BatchNode(), new BatchAllNode()]);

    const events = [
      batchInterrupted(0),
      batchCompleted(),
      extrinsicFailed()
    ];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: MockHelpers.createBatchAllCall([
        MockHelpers.createBatchCall([
          MockHelpers.createBatchAllCall([
            testInnerCall,
          ])
        ])
      ]),
      events,
      success: true
    });

    const visit = await realWorldTestWalk.walkSingleIgnoringBranches(extrinsic);

    expect(visit!.success).toBe(false);
    expect(visit!.call).toBe(testInnerCall);
    expect(visit.events).toEqual([]);
    TestAssertions.expectSignerEquals(visit.origin, signer);
  });

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
      call: createBatchAllCall(
        createBatchAllCall(
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