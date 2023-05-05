import {EventCountingContext, NestedCallNode, VisitingContext} from "../../../interfaces";
import {VisitedCall} from "../../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {IVec} from "@polkadot/types-codec/types/interfaces";
import {BatchCompleted, ItemCompleted, takeNestedBatchItemEvents} from "./types";

const CompletionEvents = [BatchCompleted]
const ItemEvents = [ItemCompleted]

export class BatchAllNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "utility" && call.method == "batchAll"
    }

    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
        const innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>
        let endExclusive = context.endExclusive

        // Safe since `endExclusiveToSkipInternalEvents` should not be called on failed items
        const indexOfCompletedEvent = context.eventQueue.indexOfLast(CompletionEvents, endExclusive)
        if (indexOfCompletedEvent == undefined) {
           throw Error("endExclusiveToSkipInternalEvents called for failed batchAll")
        }
        endExclusive = indexOfCompletedEvent

        // bathAll completed means all calls have completed
        innerCalls.forEach((innerCall) => {
            let itemIdx = context.eventQueue.indexOfLast(ItemEvents, endExclusive)
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, itemIdx)
        })

        return endExclusive
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>

        context.logger.info(`Visiting utility.batchAll with ${innerCalls.length} inner calls`)

        if (context.callSucceeded) {
            context.logger.info(`BatchAll succeeded`)
        } else  {
            context.logger.info(`BatchAll failed`)
        }

        let visitedSubItems: VisitedCall[] = new Array(innerCalls.length)
        for (let i = innerCalls.length - 1; i >= 0; i--) {
            if (context.callSucceeded) {
                const alNestedEvents = takeNestedBatchItemEvents(context, innerCalls[i])

                visitedSubItems[i] = {
                    call: innerCalls[i],
                    success: true,
                    events: alNestedEvents,
                    origin: context.origin,
                    extrinsic: context.extrinsic,
                }
            } else {
                visitedSubItems[i] = {
                    call: innerCalls[i],
                    success: false,
                    events: [],
                    origin: context.origin,
                    extrinsic: context.extrinsic,
                }
            }
        }

        for (let i = 0; i < visitedSubItems.length; i++) {
            const visitedCall = visitedSubItems[i]
            let events = visitedCall.events.map((e) => e.method)

            context.logger.info(`BatchAll - visiting batch item at ${i}, item events: ${events}`)

            await context.nestedVisit(visitedCall);
        }
    }
}