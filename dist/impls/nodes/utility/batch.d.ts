import { EventCountingContext, NestedCallNode, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
export declare class BatchNode implements NestedCallNode {
    canVisit(call: CallBase<AnyTuple>): boolean;
    endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number;
    visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void>;
    private numberOfSucceedItems;
    private lastSucceedItemIndex;
}
