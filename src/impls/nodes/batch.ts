import {AnyEvent, EventCountingContext, NestedCallNode, VisitingContext} from "../../interfaces";
import {VisitedCall} from "../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {IVec} from "@polkadot/types-codec/types/interfaces";
import {FunctionMetadataLatest} from "@polkadot/types/interfaces";
import {IEvent} from "@polkadot/types/types";

const BatchCompleted = api.events.utility.BatchCompleted
const BatchInterrupted = api.events.utility.BatchInterrupted
const ItemCompleted = api.events.utility.ItemCompleted

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

        let completionEvent = context.eventQueue.takeFromEnd(BatchCompleted, BatchInterrupted)

        context.logger.info(`Batch finished with ${completionEvent.method} outcome`)

        let lastSuccessIndex: number = this.lastSucceedItemIndex(innerCalls, completionEvent)

        let visitedSubItems: VisitedCall[] = new Array(innerCalls.length)

        // visit completed sub items
        for (let i = lastSuccessIndex; i >= 0; i--) {
            context.eventQueue.popFromEnd(ItemCompleted);

            const internalEventsEndExclusive = context.endExclusiveToSkipInternalEvents(innerCalls[i])

            // internalEnd is exclusive => it holds index of last internal event
            // thus, we delete them inclusively
            const someOfNestedEvents = context.eventQueue.takeAllAfterInclusive(internalEventsEndExclusive)

            // now it is safe to go until ItemCompleted since we removed all potential nested events above
            const remainingNestedEvents = context.eventQueue.takeTail(ItemCompleted)

            const alNestedEvents = [...remainingNestedEvents, ...someOfNestedEvents]

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

    private numberOfSucceedItems(innerCals: CallBase<AnyTuple>[], event: AnyEvent) : number {
        if (BatchCompleted.is(event)) {
            return innerCals.length
        } else if (BatchInterrupted.is(event)) {
            let [failedIndex] = event.data

            return failedIndex.toNumber()
        } else {
            return 0
        }
    }

    private lastSucceedItemIndex(innerCals: CallBase<AnyTuple>[], event: AnyEvent) : number {
        return this.numberOfSucceedItems(innerCals, event) - 1
    }
}