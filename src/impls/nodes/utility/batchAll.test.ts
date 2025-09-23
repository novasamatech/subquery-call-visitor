import { describe, test, beforeEach, expect } from '@jest/globals';
import { BatchAllNode } from './batchAll';
import { BatchNode } from './batch';
import { TestWalk } from '../../../test-utils/test-walk';
import { MockHelpers } from '../../../test-utils/mock-helpers';
import { TestAssertions } from '../../../test-utils/test-assertions';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { AnyEvent } from '../../../interfaces';

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
  });

  function createBatchCall(...innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
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

  function batchInterrupted(): AnyEvent {
    return utilityEvents.BatchInterrupted;
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
    const events = [extrinsicFailed()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall),
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

  test('shouldVisitFailedMultipleBatchedCalls', async () => {
    const events = [extrinsicFailed()];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: createBatchCall(testInnerCall, testInnerCall),
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

  // https://westend.subscan.io/extrinsic/6624751-2
  test('shouldHandleRealWorldNestedBatchWithBatchInterrupted', async () => {
    const realWorldTestWalk = new TestWalk([new BatchNode(), new BatchAllNode()]);

    const events = [
      batchCompleted(),
      batchCompleted(),
      batchCompleted(),
      batchInterrupted(),
      extrinsicFailed()
    ];

    const extrinsic = MockHelpers.createMockExtrinsic({
      signer,
      call: MockHelpers.createBatchAllCall([
        MockHelpers.createBatchCall([
          MockHelpers.createBatchCall([
            MockHelpers.createBatchCall([
              MockHelpers.createBatchAllCall([
                testInnerCall,
              ])
            ])
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
});