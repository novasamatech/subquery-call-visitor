import {EventCountingContext, NestedCallNode, VisitingContext} from "../../../interfaces";
import {VisitedCall} from "../../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {IVec} from "@polkadot/types-codec/types/interfaces";
import {
    BatchCompleted,
    BatchCompletedWithErrors, BatchInterrupted,
    ItemCompleted,
    ItemFailed,
    takeCompletedBatchItemEvents
} from "./types";

const CompletionEvents = [BatchCompleted, BatchCompletedWithErrors]
const ItemEvents = [ItemCompleted, ItemFailed]

export class ForceBatchNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "utility" && call.method == "forceBatch"
    }

    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
        const innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>
        let endExclusive = context.endExclusive

        const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents, endExclusive)
        if (indexOfCompletedEvent == undefined) {
            throw Error("endExclusiveToSkipInternalEvents called for reverted forceBatch")
        }
        endExclusive = indexOfCompletedEvent

        innerCalls.forEach((innerCall) => {
            let [itemEvent, itemEventIdx] = context.eventQueue.peekItemFromEnd(CompletionEvents, endExclusive)

            if (ItemCompleted.is(itemEvent)) {
                // only completed items emit nested events
                endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemEventIdx)
            } else {
                endExclusive = itemEventIdx
            }
        })

        return endExclusive
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>

        context.logger.info(`Visiting utility.forceBatch with ${innerCalls.length} inner calls`)

        if (context.callSucceeded) {
            context.logger.info(`ForceBatch succeeded`)

            context.eventQueue.popFromEnd(...CompletionEvents)
        } else {
            context.logger.info(`ForceBatch reverted`)
        }

        let visitedSubItems: VisitedCall[] = new Array(innerCalls.length)

        for (let i = innerCalls.length - 1; i >= 0; i--) {
            const innerCall = innerCalls[i]

            if (context.callSucceeded) {
                const itemCompletionEvent = context.eventQueue.takeFromEnd(...ItemEvents);

                if (ItemCompleted.is(itemCompletionEvent)) {
                    const allEvents = takeCompletedBatchItemEvents(context, innerCall)

                    visitedSubItems[i] = {
                        call: innerCalls[i],
                        success: true,
                        events: allEvents,
                        origin: context.origin,
                        extrinsic: context.extrinsic,
                    }

                    continue
                }
            }

            visitedSubItems[i] = {
                call: innerCalls[i],
                success: false,
                events: [],
                origin: context.origin,
                extrinsic: context.extrinsic,
            }
        }

        for (let i = 0; i < visitedSubItems.length; i++) {
            const visitedCall = visitedSubItems[i]
            let events = visitedCall.events.map((e) => e.method)

            context.logger.info(`ForceBatch - visiting batch item at ${i}, item events: ${events}`)

            await context.nestedVisit(visitedCall);
        }
    }
}