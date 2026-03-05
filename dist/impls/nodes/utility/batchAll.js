"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchAllNode = void 0;
const types_1 = require("./types");
function CompletionEvents() {
    return [(0, types_1.BatchCompleted)()];
}
function ItemEvents() {
    return [(0, types_1.ItemCompleted)()];
}
class BatchAllNode {
    canVisit(call) {
        return call.section == 'utility' && call.method == 'batchAll';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        const innerCalls = call.args[0];
        let endExclusive = context.endExclusive;
        // Safe since `endExclusiveToSkipInternalEvents` should not be called on failed items
        const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents(), endExclusive);
        if (indexOfCompletedEvent == undefined) {
            throw Error('endExclusiveToSkipInternalEvents called for failed batchAll');
        }
        endExclusive = indexOfCompletedEvent;
        // bathAll completed means all calls have completed
        for (let i = innerCalls.length - 1; i >= 0; i--) {
            let innerCall = innerCalls[i];
            let itemIdx = context.eventQueue.indexOfLast(ItemEvents(), endExclusive) || endExclusive;
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemIdx);
        }
        return endExclusive;
    }
    async visit(call, context) {
        let innerCalls = call.args[0];
        context.logger.info(`Visiting utility.batchAll with ${innerCalls.length} inner calls`);
        if (context.callSucceeded) {
            context.logger.info(`BatchAll succeeded`);
            context.eventQueue.popFromEnd((0, types_1.BatchCompleted)());
        }
        else {
            context.logger.info(`BatchAll failed`);
        }
        let visitedSubItems = new Array(innerCalls.length);
        for (let i = innerCalls.length - 1; i >= 0; i--) {
            let innerCall = innerCalls[i];
            if (context.callSucceeded) {
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
            else {
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
            if (!visitedCall)
                continue;
            let events = visitedCall.events.map(e => e.method);
            context.logger.info(`BatchAll - visiting batch item at ${i}, item events: ${events.length}`);
            await context.nestedVisit(visitedCall);
        }
    }
}
exports.BatchAllNode = BatchAllNode;
