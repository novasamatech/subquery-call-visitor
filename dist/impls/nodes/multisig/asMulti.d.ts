import { AnyEvent, EventCountingContext, NestedCallNode, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { DispatchResult } from '@polkadot/types/interfaces';
export declare class AsMultiNode implements NestedCallNode {
    canVisit(call: CallBase<AnyTuple>): boolean;
    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number;
    visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    visitFailedMultisigCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    visitSucceededMultisigCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    extractInnerMultisigCall(call: CallBase<AnyTuple>): CallBase<AnyTuple>;
    extractMultisigOrigin(call: CallBase<AnyTuple>, parentOrigin: string): string;
    getMultisigExecutedResult(event: AnyEvent): DispatchResult;
}
