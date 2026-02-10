import { AnyEvent, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
export declare function BatchCompleted(): import("@polkadot/api-base/types").AugmentedEvent<"promise", []>;
export declare function BatchCompletedWithErrors(): import("@polkadot/api-base/types").AugmentedEvent<"promise", []>;
export declare function BatchInterrupted(): import("@polkadot/api-base/types").AugmentedEvent<"promise", [index: import("@polkadot/types-codec").U32, error: import("@polkadot/types/lookup").SpRuntimeDispatchError], {
    index: import("@polkadot/types-codec").U32;
    error: import("@polkadot/types/lookup").SpRuntimeDispatchError;
}>;
export declare function ItemCompleted(): import("@polkadot/api-base/types").AugmentedEvent<"promise", []>;
export declare function ItemFailed(): import("@polkadot/api-base/types").AugmentedEvent<"promise", [error: import("@polkadot/types/lookup").SpRuntimeDispatchError], {
    error: import("@polkadot/types/lookup").SpRuntimeDispatchError;
}>;
export declare function takeCompletedBatchItemEvents(context: NodeContext, call: CallBase<AnyTuple>): AnyEvent[];
