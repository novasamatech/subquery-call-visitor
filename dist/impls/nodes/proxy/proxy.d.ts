import { AnyEvent, EventCountingContext, NestedCallNode, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { DispatchResult } from '@polkadot/types/interfaces';
export declare class ProxyNode implements NestedCallNode {
    canVisit(call: CallBase<AnyTuple>): boolean;
    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number;
    visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    visitFailedProxyCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    visitSucceededProxyCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    visitProxyCall(call: CallBase<AnyTuple>, context: NodeContext, success: boolean, events: AnyEvent[]): Promise<void>;
    callAndOriginFromProxy(proxyCall: CallBase<AnyTuple>): [CallBase<AnyTuple>, string];
    getProxyExecutedResult(event: AnyEvent): DispatchResult;
}
