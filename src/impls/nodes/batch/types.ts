import {VisitingContext} from "../../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";

export const BatchCompleted = api.events.utility.BatchCompleted
export const BatchInterrupted = api.events.utility.BatchInterrupted
export const ItemCompleted = api.events.utility.ItemCompleted

export function takeNestedBatchItemEvents(context: VisitingContext, call: CallBase<AnyTuple>) {
    context.eventQueue.popFromEnd(ItemCompleted);

    const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call)

    // internalEnd is exclusive => it holds index of last internal event
    // thus, we delete them inclusively
    const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive)

    // now it is safe to go until ItemCompleted since we removed all potential nested events above
    const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted)

    return [...remainingNestedEvents, ...someOfNestedEvents]
}