import { NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { ensure } from '../../../utils';

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

export function takeCompletedBatchItemEvents(context: NodeContext, call: CallBase<AnyTuple>) {
  const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);

  // internalEnd is exclusive => it holds index of last internal event
  // thus, we delete them inclusively
  const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);

  // now it is safe to go until ItemCompleted\ItemFailed since we removed all potential nested events above
  const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted(), ItemFailed());

  return [...remainingNestedEvents, ...someOfNestedEvents];
}

export function requireItemCompleted() {
 return ensure(ItemCompleted(), "ItemCompleted is not defined");
}

export function requireItemFailed() {
  return ensure(ItemFailed(), "ItemFailed is not defined");
}