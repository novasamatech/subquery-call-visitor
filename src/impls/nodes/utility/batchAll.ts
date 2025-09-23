import { EventCountingContext, NestedCallNode, NodeContext } from '../../../interfaces';
import { VisitedCall } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { IVec } from '@polkadot/types-codec/types/interfaces';
import { BatchCompleted, BatchCompletedWithErrors, ItemCompleted, ItemFailed, takeCompletedBatchItemEvents } from './types';

const CompletionEvents = [BatchCompleted, BatchCompletedWithErrors];
const ItemEvents = [ItemCompleted, ItemFailed];

export class BatchAllNode implements NestedCallNode {
  canVisit(call: CallBase<AnyTuple>): boolean {
    return call.section == 'utility' && call.method == 'batchAll';
  }

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
    const innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>;
    let endExclusive = context.endExclusive;

    // Safe since `endExclusiveToSkipInternalEvents` should not be called on failed items
    const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents, endExclusive);
    if (indexOfCompletedEvent == undefined) {
      throw Error('endExclusiveToSkipInternalEvents called for failed batchAll');
    }
    endExclusive = indexOfCompletedEvent;

    // batchAll completed means all calls have completed (either successfully or with errors)
    for (let i = innerCalls.length - 1; i >= 0; i--) {
      let innerCall = innerCalls[i];
      if (!innerCall) continue;
      let itemIdx = context.eventQueue.indexOfLast(ItemEvents, endExclusive);
      if (typeof itemIdx === 'undefined') continue;
      endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemIdx);
    }

    return endExclusive;
  }

  async visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void> {
    let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>;

    context.logger.info(`Visiting utility.batchAll with ${innerCalls.length} inner calls`);

    if (context.callSucceeded) {
      context.logger.info(`BatchAll succeeded`);
    } else {
      context.logger.info(`BatchAll failed`);
    }

    let visitedSubItems: VisitedCall[] = new Array(innerCalls.length);

    if (context.callSucceeded) {
      // Process items in reverse order to match event order
      for (let i = innerCalls.length - 1; i >= 0; i--) {
        let innerCall = innerCalls[i];
        if (!innerCall) continue;

        // Check if this item succeeded or failed by looking at the event
        const itemEvent = context.eventQueue.takeFromEnd(ItemCompleted, ItemFailed);
        let itemSuccess = false;
        
        if (itemEvent) {
          itemSuccess = ItemCompleted?.is(itemEvent) || false;
        }

        const alNestedEvents = takeCompletedBatchItemEvents(context, innerCall);

        visitedSubItems[i] = {
          call: innerCall,
          success: itemSuccess,
          events: alNestedEvents,
          origin: context.origin,
          extrinsic: context.extrinsic,
        };
      }
    } else {
      // If batchAll failed, all inner calls are considered failed
      for (let i = 0; i < innerCalls.length; i++) {
        let innerCall = innerCalls[i];
        if (!innerCall) continue;
        
        visitedSubItems[i] = {
          call: innerCall,
          success: false,
          events: [],
          origin: context.origin,
          extrinsic: context.extrinsic,
        };
      }
    }

    for (let i = 0; i < visitedSubItems.length; i++) {
      const visitedCall = visitedSubItems[i];
      if (!visitedCall) continue;
      let events = visitedCall.events.map(e => e.method);

      context.logger.info(`BatchAll - visiting batch item at ${i}, item events: ${events.length}`);

      await context.nestedVisit(visitedCall);
    }
  }
}
