import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
export declare const MultisigExecuted: import("@polkadot/api-base/types").AugmentedEvent<"promise", [approving: import("@polkadot/types/interfaces/runtime/types").AccountId32, timepoint: import("@polkadot/types/lookup").PalletMultisigTimepoint, multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32, callHash: import("@polkadot/types-codec").U8aFixed, result: import("@polkadot/types-codec").Result<import("@polkadot/types-codec").Null, import("@polkadot/types/lookup").SpRuntimeDispatchError>], {
    approving: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    timepoint: import("@polkadot/types/lookup").PalletMultisigTimepoint;
    multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    callHash: import("@polkadot/types-codec").U8aFixed;
    result: import("@polkadot/types-codec").Result<import("@polkadot/types-codec").Null, import("@polkadot/types/lookup").SpRuntimeDispatchError>;
}>;
export declare const MultisigApproval: import("@polkadot/api-base/types").AugmentedEvent<"promise", [approving: import("@polkadot/types/interfaces/runtime/types").AccountId32, timepoint: import("@polkadot/types/lookup").PalletMultisigTimepoint, multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32, callHash: import("@polkadot/types-codec").U8aFixed], {
    approving: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    timepoint: import("@polkadot/types/lookup").PalletMultisigTimepoint;
    multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    callHash: import("@polkadot/types-codec").U8aFixed;
}>;
export declare const NewMultisig: import("@polkadot/api-base/types").AugmentedEvent<"promise", [approving: import("@polkadot/types/interfaces/runtime/types").AccountId32, multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32, callHash: import("@polkadot/types-codec").U8aFixed], {
    approving: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    multisig: import("@polkadot/types/interfaces/runtime/types").AccountId32;
    callHash: import("@polkadot/types-codec").U8aFixed;
}>;
export declare function generateMultisigAddress(origin: string, otherSignatories: IVec<AccountId>, threshold: number): string;
