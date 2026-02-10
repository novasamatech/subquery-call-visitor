"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchCompleted = BatchCompleted;
exports.BatchCompletedWithErrors = BatchCompletedWithErrors;
exports.BatchInterrupted = BatchInterrupted;
exports.ItemCompleted = ItemCompleted;
exports.ItemFailed = ItemFailed;
exports.takeCompletedBatchItemEvents = takeCompletedBatchItemEvents;
function BatchCompleted() {
    return api.events.utility?.BatchCompleted;
}
function BatchCompletedWithErrors() {
    return api.events.utility?.BatchCompletedWithErrors;
}
function BatchInterrupted() {
    return api.events.utility?.BatchInterrupted;
}
function ItemCompleted() {
    return api.events.utility?.ItemCompleted;
}
function ItemFailed() {
    return api.events.utility?.ItemFailed;
}
function ItemEventsExistsInRuntime() {
    return ItemCompleted() !== undefined;
}
function takeCompletedBatchItemEvents(context, call) {
    if (!ItemEventsExistsInRuntime()) {
        const currentEvents = context.eventQueue.all();
        // Delete nested events that case collisions
        const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);
        context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);
        return currentEvents;
    }
    const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(call);
    // internalEnd is exclusive => it holds index of last internal event
    // thus, we delete them inclusively
    const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive);
    // now it is safe to go until ItemCompleted\ItemFailed since we removed all potential nested events above
    const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted(), ItemFailed());
    return [...remainingNestedEvents, ...someOfNestedEvents];
}
