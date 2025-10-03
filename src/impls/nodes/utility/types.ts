import { AnyEvent, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';

export function BatchCompleted(){
  return api.events.utility?.BatchCompleted;
}
export function BatchCompletedWithErrors(){
  return api.events.utility?.BatchCompletedWithErrors;
}
export function BatchInterrupted(){
  return api.events.utility?.BatchInterrupted;
}
export function ItemCompleted(){
  return api.events.utility?.ItemCompleted;
}
export function ItemFailed(){
  return api.events.utility?.ItemFailed;
}

function ItemEventsExistsInRuntime(): boolean {
  return ItemCompleted() !== undefined
}

export function takeCompletedBatchItemEvents(
  context: NodeContext,
  call: CallBase<AnyTuple>,
): AnyEvent[] {
  if (!ItemEventsExistsInRuntime()) {
    // Unless the batch is just of size 1
    return context.eventQueue.all()
    // if (batchLength > 0) {
    //   // We cannot derive which events corresponds to a batch item on older blocks
    //   return []
    // } else {
    //
    // }
  }

  const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);

  // internalEnd is exclusive => it holds index of last internal event
  // thus, we delete them inclusively
  const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);

  // now it is safe to go until ItemCompleted\ItemFailed since we removed all potential nested events above
  const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted(), ItemFailed());

  return [...remainingNestedEvents, ...someOfNestedEvents];
}