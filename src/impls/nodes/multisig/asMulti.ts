import {EventCountingContext, NestedCallNode, VisitedCall, VisitingContext} from "../../../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {IVec} from "@polkadot/types-codec/types/interfaces";
import {AccountId} from "@polkadot/types/interfaces/runtime/types";
import {INumber} from "@polkadot/types-codec/types/interfaces";
import {generateMultisigAddress, MultisigApproval, MultisigExecuted} from "./common";


const CompletionEvents = [MultisigExecuted, MultisigApproval]

export class AsMultiNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "multisig" && call.method == "asMulti"
    }

    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
        let endExclusive = context.endExclusive

        const [completionEvent, completionIdx] = context.eventQueue.peekItemFromEnd(CompletionEvents, endExclusive)
        endExclusive = completionIdx

        if (MultisigExecuted.is(completionEvent) && completionEvent.data.result.isOk) {
            const innerCall = this.extractInnerMultisigCall(call)
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive)
        }

        return endExclusive
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        if (!context.callSucceeded) {
            await this.visitFailedMultisigCall(call, context)
            context.logger.info("asMulti - reverted by outer parent")
            return
        }

        const completionEvent = context.eventQueue.takeFromEnd(...CompletionEvents)

        if (MultisigExecuted.is(completionEvent)) {
            if (completionEvent.data.result.isOk) {
                context.logger.info("asMulti - execution succeeded")

                await this.visitSucceededMultisigCall(call, context)
            } else {
                context.logger.info("asMulti - execution failed")

                await this.visitFailedMultisigCall(call, context)
            }
        }
    }

    async visitFailedMultisigCall(call: CallBase<AnyTuple>, context: VisitingContext) : Promise<void> {
        const visitedCall: VisitedCall = {
            success: false,
            origin: this.extractMultisigOrigin(call, context.origin),
            call: this.extractInnerMultisigCall(call),
            events: [],
            extrinsic: context.extrinsic
        }

        await context.nestedVisit(visitedCall)
    }

    async visitSucceededMultisigCall(call: CallBase<AnyTuple>, context: VisitingContext) : Promise<void> {
        const visitedCall: VisitedCall = {
            success: true,
            origin: this.extractMultisigOrigin(call, context.origin),
            call: this.extractInnerMultisigCall(call),
            events: context.eventQueue.all(),
            extrinsic: context.extrinsic
        }

        await context.nestedVisit(visitedCall)
    }

    extractInnerMultisigCall(call: CallBase<AnyTuple>): CallBase<AnyTuple> {
        return call.args[3] as CallBase<AnyTuple>
    }

    extractMultisigOrigin(call: CallBase<AnyTuple>, parentOrigin: string): string {
        const [threshold, otherSignatories] = call.args

        return generateMultisigAddress(
            parentOrigin,
            otherSignatories as IVec<AccountId>,
            (threshold as INumber).toNumber()
        )
    }
}