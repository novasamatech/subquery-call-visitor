import { VisitingContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';

export const BatchCompleted = api.events.utility?.BatchCompleted;
export const BatchCompletedWithErrors = api.events.utility?.BatchCompletedWithErrors;
export const BatchInterrupted = api.events.utility?.BatchInterrupted;
export const ItemCompleted = api.events.utility?.ItemCompleted;
export const ItemFailed = api.events.utility?.ItemFailed;

export function takeCompletedBatchItemEvents(context: VisitingContext, call: CallBase<AnyTuple>) {
  const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);

  // internalEnd is exclusive => it holds index of last internal event
  // thus, we delete them inclusively
  const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);

  // now it is safe to go until ItemCompleted\ItemFailed since we removed all potential nested events above
  const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted, ItemFailed);

  return [...remainingNestedEvents, ...someOfNestedEvents];
}
