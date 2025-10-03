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
    const currentEvents = context.eventQueue.all()

    // Delete nested events that case collisions
    const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);
    context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);

    return currentEvents
  }

  const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);

  // internalEnd is exclusive => it holds index of last internal event
  // thus, we delete them inclusively
  const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);

  // now it is safe to go until ItemCompleted\ItemFailed since we removed all potential nested events above
  const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted(), ItemFailed());

  return [...remainingNestedEvents, ...someOfNestedEvents];
}