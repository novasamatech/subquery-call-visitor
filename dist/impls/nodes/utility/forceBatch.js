"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForceBatchNode = void 0;
const types_1 = require("./types");
function CompletionEvents() {
    return [(0, types_1.BatchCompleted)(), (0, types_1.BatchCompletedWithErrors)()];
}
function ItemEvents() {
    return [(0, types_1.ItemCompleted)(), (0, types_1.ItemFailed)()];
}
class ForceBatchNode {
    canVisit(call) {
        return call.section == 'utility' && call.method == 'forceBatch';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        const innerCalls = call.args[0];
        let endExclusive = context.endExclusive;
        const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents(), endExclusive);
        if (indexOfCompletedEvent == undefined) {
            throw Error('endExclusiveToSkipInternalEvents called for reverted forceBatch');
        }
        endExclusive = indexOfCompletedEvent;
        for (let i = innerCalls.length - 1; i >= 0; i--) {
            let innerCall = innerCalls[i];
            let item = context.eventQueue.peekItemFromEnd(ItemEvents(), endExclusive);
            if (!item)
                continue;
            let [itemEvent, itemEventIdx] = item;
            if ((0, types_1.ItemCompleted)()?.is(itemEvent)) {
                // only completed items emit nested events
                endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemEventIdx);
            }
            else {
                endExclusive = itemEventIdx;
            }
        }
        return endExclusive;
    }
    async visit(call, context) {
        let innerCalls = call.args[0];
        context.logger.info(`Visiting utility.forceBatch with ${innerCalls.length} inner calls`);
        if (context.callSucceeded) {
            context.logger.info(`ForceBatch succeeded`);
            context.eventQueue.popFromEnd(...CompletionEvents());
        }
        else {
            context.logger.info(`ForceBatch reverted`);
        }
        let visitedSubItems = new Array(innerCalls.length);
        for (let i = innerCalls.length - 1; i >= 0; i--) {
            const innerCall = innerCalls[i];
            if (!innerCall)
                continue;
            if (context.callSucceeded) {
                const itemCompletionEvent = context.eventQueue.takeFromEnd(...ItemEvents());
                if (itemCompletionEvent && (0, types_1.ItemCompleted)().is(itemCompletionEvent)) {
                    const allEvents = (0, types_1.takeCompletedBatchItemEvents)(context, innerCall);
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
            if (!visitedCall)
                continue;
            let events = visitedCall.events.map(e => e.method);
            context.logger.info(`ForceBatch - visiting batch item at ${i}, item events: ${events.length}`);
            await context.nestedVisit(visitedCall);
        }
    }
}
exports.ForceBatchNode = ForceBatchNode;
