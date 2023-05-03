import {NestedCallNode, VisitingContext} from "../../interfaces";
import {VisitedCall} from "../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {IVec} from "@polkadot/types-codec/types/interfaces";

const BatchCompleted = api.events.utility.BatchCompleted
const BatchInterrupted = api.events.utility.BatchInterrupted
const ItemCompleted = api.events.utility.ItemCompleted

export class BatchNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "utility" && call.method == "batch"
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        let innerCalls = call.args[0] as IVec<CallBase<AnyTuple>>

        context.logger.info(`Visiting utility.batch with ${innerCalls.length} inner calls`)

        let completionEvent = context.eventQueue.popFromEnd(BatchCompleted, BatchInterrupted)

        context.logger.info(`Batch finished with ${completionEvent} outcome`)

        let lastSuccessIndex: number
        if (BatchCompleted.is(completionEvent)) {
            lastSuccessIndex = innerCalls.length - 1
        } else if (BatchInterrupted.is(completionEvent)) {
            let [failedIndex] = completionEvent.data

            lastSuccessIndex = failedIndex.toNumber() - 1
        }

        let visitedSubItems: VisitedCall[] = new Array(innerCalls.length)

        // visit completed sub items
        for (let i = lastSuccessIndex; i >= 0; i--) {
            context.eventQueue.popFromEnd(ItemCompleted);

            visitedSubItems[i] = {
                call: innerCalls[i],
                success: true,
                events: context.eventQueue.takeTail(ItemCompleted),
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

        for (const visitedCall of visitedSubItems) {
            await context.nestedVisit(visitedCall);
        }
    }
}