"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchNode = void 0;
const types_1 = require("./types");
function CompletionEvents() {
    return [(0, types_1.BatchCompleted)(), (0, types_1.BatchInterrupted)()];
}
function ItemEvents() {
    return [(0, types_1.ItemCompleted)()];
}
class BatchNode {
    canVisit(call) {
        return call.section == 'utility' && call.method == 'batch';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        let innerCalls = call.args[0];
        let endExclusive = context.endExclusive;
        let completionItem = context.eventQueue.peekItemFromEnd(CompletionEvents(), endExclusive);
        let [completionEvent, completionIdx] = completionItem;
        endExclusive = completionIdx;
        let lastSuccessIndex = this.lastSucceedItemIndex(innerCalls, completionEvent);
        for (let i = lastSuccessIndex; i >= 0; i--) {
            let innerCall = innerCalls[i];
            let itemIdx = context.eventQueue.indexOfLast(ItemEvents(), endExclusive) || endExclusive;
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemIdx);
        }
        return endExclusive;
    }
    async visit(call, context) {
        let innerCalls = call.args[0];
        context.logger.info(`Visiting utility.batch with ${innerCalls.length} inner calls`);
        let lastSuccessIndex = 0;
        if (context.callSucceeded) {
            let completionEvent = context.eventQueue.takeFromEnd((0, types_1.BatchCompleted)(), (0, types_1.BatchInterrupted)());
            if (completionEvent) {
                context.logger.info(`Batch finished with ${completionEvent.method} outcome`);
                lastSuccessIndex = this.lastSucceedItemIndex(innerCalls, completionEvent);
            }
            else {
                throw new Error("Batch succeeded but no BatchCompleted or BatchInterrupted were found");
            }
        }
        else {
            context.logger.info(`Batch was reverted by the outer parent`);
            lastSuccessIndex = -1;
        }
        let visitedSubItems = new Array(innerCalls.length);
        // visit completed sub items
        for (let i = lastSuccessIndex; i >= 0; i--) {
            let innerCall = innerCalls[i];
            context.eventQueue.popFromEnd((0, types_1.ItemCompleted)());
            const alNestedEvents = (0, types_1.takeCompletedBatchItemEvents)(context, innerCall);
            visitedSubItems[i] = {
                call: innerCall,
                success: true,
                events: alNestedEvents,
                origin: context.origin,
                extrinsic: context.extrinsic,
            };
        }
        // visit uncompleted sub items
        for (let i = lastSuccessIndex + 1; i < innerCalls.length; i++) {
            let innerCall = innerCalls[i];
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
            let events = visitedCall.events.map(e => e.method);
            context.logger.info(`Batch - visiting batch item at ${i}, item events: ${events.length}`);
            await context.nestedVisit(visitedCall);
        }
    }
    numberOfSucceedItems(innerCals, event) {
        if ((0, types_1.BatchCompleted)()?.is(event)) {
            return innerCals.length;
        }
        else if ((0, types_1.BatchInterrupted)()?.is(event)) {
            let [failedIndex] = event.data;
            return failedIndex.toNumber();
        }
        else {
            return 0;
        }
    }
    lastSucceedItemIndex(innerCals, event) {
        return this.numberOfSucceedItems(innerCals, event) - 1;
    }
}
exports.BatchNode = BatchNode;
