import { EventCountingContext, NestedCallNode, NodeContext } from '../../../interfaces';
import { VisitedCall } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { IVec } from '@polkadot/types-codec/types/interfaces';
import {
  BatchCompleted,
  BatchCompletedWithErrors,
  ItemCompleted,
  ItemFailed,
  takeCompletedBatchItemEvents,
} from './types';

function CompletionEvents() {
  return [BatchCompleted(), BatchCompletedWithErrors()]
}

function ItemEvents(){
  return [ItemCompleted(), ItemFailed()];
}

export class ForceBatchNode implements NestedCallNode {
  canVisit(call: CallBase<AnyTuple>): boolean {
    return call.section == 'utility' && call.method == 'forceBatch';
  }

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
    const innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>;
    let endExclusive = context.endExclusive;

    const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents(), endExclusive);
    if (indexOfCompletedEvent == undefined) {
      throw Error('endExclusiveToSkipInternalEvents called for reverted forceBatch');
    }
    endExclusive = indexOfCompletedEvent;

    for (let i = innerCalls.length - 1; i >= 0; i--) {
      let innerCall = innerCalls[i]!;
      let item = context.eventQueue.peekItemFromEnd(ItemEvents(), endExclusive);
      if (!item) continue;
      let [itemEvent, itemEventIdx] = item;

      if (ItemCompleted()?.is(itemEvent)) {
        // only completed items emit nested events
        endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemEventIdx);
      } else {
        endExclusive = itemEventIdx;
      }
    }

    return endExclusive;
  }

  async visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void> {
    let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>;

    context.logger.info(`Visiting utility.forceBatch with ${innerCalls.length} inner calls`);

    if (context.callSucceeded) {
      context.logger.info(`ForceBatch succeeded`);

      context.eventQueue.popFromEnd(...CompletionEvents());
    } else {
      context.logger.info(`ForceBatch reverted`);
    }

    let visitedSubItems: VisitedCall[] = new Array(innerCalls.length);

    for (let i = innerCalls.length - 1; i >= 0; i--) {
      const innerCall = innerCalls[i];
      if (!innerCall) continue;

      if (context.callSucceeded) {
        const itemCompletionEvent = context.eventQueue.takeFromEnd(...ItemEvents());

        if (itemCompletionEvent && ItemCompleted().is(itemCompletionEvent)) {
          const allEvents = takeCompletedBatchItemEvents(context, innerCall);

          visitedSubItems[i] = {
            call: innerCall,
            success: true,
            events: allEvents,
            origin: context.origin,
            extrinsic: context.extrinsic,
          };

          continue;
        }
      }

      visitedSubItems[i] = {
        call: innerCall,
        success: false,
        events: [],
        origin: context.origin,
        extrinsic: context.extrinsic,
      };
    }

    for (let i = 0; i < visitedSubItems.length; i++) {
      const visitedCall = visitedSubItems[i];
      if (!visitedCall) continue;
      let events = visitedCall.events.map(e => e.method);

      context.logger.info(`ForceBatch - visiting batch item at ${i}, item events: ${events.length}`);

      await context.nestedVisit(visitedCall);
    }
  }
}
