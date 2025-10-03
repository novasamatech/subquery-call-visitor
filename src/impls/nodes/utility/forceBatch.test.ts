import { describe, test, beforeEach, expect } from '@jest/globals';
import { ForceBatchNode } from './forceBatch';
import { TestWalk, MockHelpers, TestAssertions } from '../../../test-utils';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { AnyEvent } from '../../../interfaces';
import { setItemEventsPresent } from '../../../test-utils/setup';

describe('ForceBatchWalkTest', () => {
  let testWalk: TestWalk;
  let utilityEvents: ReturnType<typeof MockHelpers.createUtilityEvents>;
  let testEvent: AnyEvent;
  let testInnerCall: CallBase<AnyTuple>;
  const signer = new Uint8Array([0x00]);

  beforeEach(() => {
    testWalk = new TestWalk([new ForceBatchNode()]);
    utilityEvents = MockHelpers.createUtilityEvents();
    testEvent = MockHelpers.createTestEvent();
    testInnerCall = MockHelpers.createTestCall();
    setItemEventsPresent(true)
  });

  function createForceBatchCall(...innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
    return MockHelpers.createForceBatchCall(innerCalls);
  }

  function itemCompleted(): AnyEvent {
    return utilityEvents.ItemCompleted;
  }

  function itemFailed(): AnyEvent {
    return utilityEvents.ItemFailed;
  }

  function batchCompleted(): AnyEvent {
    return utilityEvents.BatchCompleted;
  }

  function batchCompletedWithErrors(): AnyEvent {
    return utilityEvents.BatchCompletedWithErrors;
  }

  function extrinsicSuccess(): AnyEvent {
    return utilityEvents.ExtrinsicSuccess;
  }

  test('shouldVisitSucceededSingleBatchedCall', async () => {
    const innerBatchEvents = [testEvent];
    const events = [...innerBatchEvents, itemCompleted(), batchCompleted(), extrinsicSuccess()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createForceBatchCall(testInnerCall),
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
    const innerBatchEvents = [testEvent];
    const events = [...innerBatchEvents, itemFailed(), batchCompletedWithErrors(), extrinsicSuccess()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createForceBatchCall(testInnerCall),
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
      call: createForceBatchCall(testInnerCall, testInnerCall),
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

  test('shouldVisitMixedMultipleBatchedCalls', async () => {
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

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createForceBatchCall(testInnerCall, testInnerCall, testInnerCall),
      events,
      success: true
    });

    const visits = await testWalk.walkMultipleIgnoringBranches(extrinsic, 3);

    const expected: Array<{ success: boolean; events: AnyEvent[] }> = [
      { success: true, events: innerBatchEvents },
      { success: false, events: [] },
      { success: true, events: innerBatchEvents }
    ];

    visits.forEach((visit, index) => {
      const exp = expected[index]!;
      expect(visit.success).toBe(exp.success);
      TestAssertions.expectSignerEquals(visit.origin, signer);
      expect(visit.call).toBe(testInnerCall);
      expect(visit.events).toEqual(exp.events);
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
      call: createForceBatchCall(
        testInnerCall,
        createForceBatchCall(
          testInnerCall,
          createForceBatchCall(
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
});