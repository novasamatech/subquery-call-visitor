import { AnyEvent, EventCountingContext, NestedCallNode, VisitedCall, VisitingContext } from "../../../interfaces";
import { CallBase } from "@polkadot/types/types/calls";
import { AnyTuple } from "@polkadot/types-codec/types";
import { Codec } from "@polkadot/types/types";
import { Address } from "@polkadot/types/interfaces/runtime/types";
import { DispatchResult } from "@polkadot/types/interfaces";


const ProxyExecuted = api.events.proxy.ProxyExecuted
const CompletionEvents = [ProxyExecuted]

const calls = ["proxy", "proxyAnnounced"]

export class ProxyNode implements NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean {
        return call.section == "proxy" && calls.includes(call.method)
    }

    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
        let endExclusive = context.endExclusive

        const [completionEvent, completionIdx] = context.eventQueue.peekItemFromEnd(CompletionEvents, endExclusive)
        endExclusive = completionIdx
        const result = this.getProxyExecutedResult(completionEvent);

        if (ProxyExecuted.is(completionEvent) && result.isOk) {
            const [innerCall] = this.callAndOriginFromProxy(call)
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive)
        }

        return endExclusive
    }

    async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        if (!context.callSucceeded) {
            await this.visitFailedProxyCall(call, context)
            context.logger.info("proxy - reverted by outer parent")
            return
        }

        const completionEvent = context.eventQueue.takeFromEnd(...CompletionEvents)
        const result = this.getProxyExecutedResult(completionEvent);

        if (ProxyExecuted.is(completionEvent) && result.isOk) {
            context.logger.info("proxy - execution succeeded")

            await this.visitSucceededProxyCall(call, context)
        } else {
            context.logger.info("proxy - execution failed")

            await this.visitFailedProxyCall(call, context)
        }
    }

    async visitFailedProxyCall(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        const success = false
        const events = []

        await this.visitProxyCall(call, context, success, events)
    }

    async visitSucceededProxyCall(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
        const success = true
        const events = context.eventQueue.all()

        await this.visitProxyCall(call, context, success, events)
    }

    async visitProxyCall(
        call: CallBase<AnyTuple>,
        context: VisitingContext,
        success: boolean,
        events: AnyEvent[]
    ) {
        let [innerCall, innerOrigin] = this.callAndOriginFromProxy(call)

        const visitedCall: VisitedCall = {
            success: success,
            origin: innerOrigin,
            call: innerCall,
            events: events,
            extrinsic: context.extrinsic
        }

        await context.nestedVisit(visitedCall)
    }

    callAndOriginFromProxy(proxyCall: CallBase<AnyTuple>): [CallBase<AnyTuple>, string] {
        let proxyOrigin: Codec
        let proxiedCall: Codec

        if (proxyCall.method == "proxy") {
            // args = [real, force_proxy_type, call]
            proxyOrigin = proxyCall.args[0]
            proxiedCall = proxyCall.args[2]
        } else if (proxyCall.method == "proxyAnnounced") {
            // args = [delegate, real, force_proxy_type, call]
            proxyOrigin = proxyCall.args[1]
            proxiedCall = proxyCall.args[3]
        } else {
            throw Error(`Invalid state - unknown proxy method: ${proxyCall.method}`)
        }

        return [proxiedCall as CallBase<AnyTuple>, (proxyOrigin as Address).toString()]
    }

    getProxyExecutedResult(event: AnyEvent): DispatchResult {
        // @ts-expect-error Property 'result' does not exist on type 'AnyTuple & IEventData'
        return event.data.result || event.data.at(0);
    }
}