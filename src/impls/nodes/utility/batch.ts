import { AnyEvent, EventCountingContext, NestedCallNode, VisitingContext } from "../../../interfaces";
import { VisitedCall } from "../../../interfaces";
import { CallBase } from "@polkadot/types/types/calls";
import { AnyTuple } from "@polkadot/types-codec/types";
import { IVec } from "@polkadot/types-codec/types/interfaces";
import { BatchCompleted, BatchInterrupted, ItemCompleted, takeCompletedBatchItemEvents } from "./types";

const CompletionEvents = [BatchCompleted, BatchInterrupted]
const ItemEvents = [ItemCompleted]

export class BatchNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "utility" && call.method == "batch"
    }

    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
        let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>

        let endExclusive = context.endExclusive

        let [completionEvent, completionIdx] = context.eventQueue.peekItemFromEnd(CompletionEvents, endExclusive)
        endExclusive = completionIdx

        let lastSuccessIndex = this.lastSucceedItemIndex(innerCalls, completionEvent)

        for (let i = lastSuccessIndex; i >= 0; i--) {
            let itemIdx = context.eventQueue.indexOfLast(ItemEvents, endExclusive)
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCalls[i], itemIdx)
        }

        return endExclusive
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>

        context.logger.info(`Visiting utility.batch with ${innerCalls.length} inner calls`)

        let lastSuccessIndex: number

        if (context.callSucceeded) {
            let completionEvent = context.eventQueue.takeFromEnd(BatchCompleted, BatchInterrupted)

            context.logger.info(`Batch finished with ${completionEvent.method} outcome`)

            lastSuccessIndex = this.lastSucceedItemIndex(innerCalls, completionEvent)
        } else {
            context.logger.info(`Batch was reverted by the outer parent`)

            lastSuccessIndex = -1
        }

        let visitedSubItems: VisitedCall[] = new Array(innerCalls.length)

        // visit completed sub items
        for (let i = lastSuccessIndex; i >= 0; i--) {
            context.eventQueue.popFromEnd(ItemCompleted);
            const alNestedEvents = takeCompletedBatchItemEvents(context, innerCalls[i])

            visitedSubItems[i] = {
                call: innerCalls[i],
                success: true,
                events: alNestedEvents,
                origin: context.origin,
                extrinsic: context.extrinsic,
            }
        }

        // visit uncompleted sub items
        for (let i = lastSuccessIndex + 1; i < innerCalls.length; i++) {
            visitedSubItems[i] = {
                call: innerCalls[i],
                success: false,
                events: [],
                origin: context.origin,
                extrinsic: context.extrinsic
            }
        }

        for (let i = 0; i < visitedSubItems.length; i++) {
            const visitedCall = visitedSubItems[i]
            let events = visitedCall.events.map((e) => e.method)

            context.logger.info(`Batch - visiting batch item at ${i}, item events: ${events}`)

            await context.nestedVisit(visitedCall);
        }
    }

    private numberOfSucceedItems(innerCals: CallBase<AnyTuple>[], event: AnyEvent): number {
        if (BatchCompleted.is(event)) {
            return innerCals.length
        } else if (BatchInterrupted.is(event)) {
            let [failedIndex] = event.data

            return failedIndex.toNumber()
        } else {
            return 0
        }
    }

    private lastSucceedItemIndex(innerCals: CallBase<AnyTuple>[], event: AnyEvent): number {
        return this.numberOfSucceedItems(innerCals, event) - 1
    }
}