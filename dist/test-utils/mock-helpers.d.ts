import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { SubstrateExtrinsic, SubstrateEvent } from '@subql/types';
import { AnyEvent } from '../interfaces';
export interface MockCallOptions {
    section: string;
    method: string;
    args?: any[];
}
export interface MockEventOptions {
    section: string;
    method: string;
    args?: any[];
}
export interface MockExtrinsicOptions {
    signer: string | Uint8Array;
    call: CallBase<AnyTuple>;
    events: AnyEvent[];
    success?: boolean;
}
export declare class MockHelpers {
    static createMockCall(options: MockCallOptions): CallBase<AnyTuple>;
    static createMockEvent(options: MockEventOptions): AnyEvent;
    static createMockSubstrateEvent(event: AnyEvent): SubstrateEvent;
    static createMockExtrinsic(options: MockExtrinsicOptions): SubstrateExtrinsic;
    static signerToString(signer: string | Uint8Array): string;
    static createMockEventType(section: string, method: string): {
        is: (event: AnyEvent) => boolean;
    };
    static createUtilityEvents(): {
        ItemCompleted: AnyEvent;
        BatchCompleted: AnyEvent;
        BatchCompletedWithErrors: AnyEvent;
        BatchInterrupted: (index: number) => AnyEvent;
        ItemFailed: AnyEvent;
        ExtrinsicSuccess: AnyEvent;
        ExtrinsicFailed: AnyEvent;
    };
    static createUtilityEventTypes(): {
        ItemCompleted: {
            is: (event: AnyEvent) => boolean;
        };
        BatchCompleted: {
            is: (event: AnyEvent) => boolean;
        };
        BatchCompletedWithErrors: {
            is: (event: AnyEvent) => boolean;
        };
        BatchInterrupted: {
            is: (event: AnyEvent) => boolean;
        };
        ItemFailed: {
            is: (event: AnyEvent) => boolean;
        };
        ExtrinsicSuccess: {
            is: (event: AnyEvent) => boolean;
        };
        ExtrinsicFailed: {
            is: (event: AnyEvent) => boolean;
        };
    };
    static createBatchAllCall(innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple>;
    static createBatchCall(innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple>;
    static createForceBatchCall(innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple>;
    static createTestCall(section?: string, method?: string): CallBase<AnyTuple>;
    static createTestEvent(section?: string, method?: string): AnyEvent;
}
