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

export class MockHelpers {
  static createMockCall(options: MockCallOptions): CallBase<AnyTuple> {
    const mockCall = {
      section: options.section,
      method: options.method,
      args: options.args || [],
      toHuman: () => ({ section: options.section, method: options.method }),
      toString: () => `${options.section}.${options.method}`
    } as unknown as CallBase<AnyTuple>;

    return mockCall;
  }

  static createMockEvent(options: MockEventOptions): AnyEvent {
    const mockEvent = {
      section: options.section,
      method: options.method,
      data: options.args || [],
      toHuman: () => ({ section: options.section, method: options.method }),
      toString: () => `${options.section}.${options.method}`
    } as unknown as AnyEvent;

    return mockEvent;
  }

  static createMockSubstrateEvent(event: AnyEvent): SubstrateEvent {
    return {
      event,
      phase: { isApplyExtrinsic: true, asApplyExtrinsic: 0 },
      topics: []
    } as unknown as SubstrateEvent;
  }

  static createMockExtrinsic(options: MockExtrinsicOptions): SubstrateExtrinsic {
    const mockExtrinsic = {
      extrinsic: {
        method: options.call,
        signer: {
          toString: () => MockHelpers.signerToString(options.signer)
        }
      },
      events: options.events.map(event => MockHelpers.createMockSubstrateEvent(event)),
      success: options.success !== undefined ? options.success : true,
      block: {
        block: { header: { number: { toNumber: () => 1000 } } }
      },
      idx: 0
    } as unknown as SubstrateExtrinsic;

    return mockExtrinsic;
  }

  static signerToString(signer: string | Uint8Array): string {
    return typeof signer === 'string' ? signer : Array.from(signer).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create mock event types that can be used for event matching
  static createMockEventType(section: string, method: string) {
    return {
      is: (event: AnyEvent) => event.section === section && event.method === method
    };
  }

  static createUtilityEvents() {
    return {
      ItemCompleted: MockHelpers.createMockEvent({
        section: 'utility',
        method: 'ItemCompleted'
      }),
      BatchCompleted: MockHelpers.createMockEvent({
        section: 'utility',
        method: 'BatchCompleted'
      }),
      BatchInterrupted: (index: number) => MockHelpers.createMockEvent({
        section: 'utility',
        method: 'BatchInterrupted',
        args: [{ toNumber: () => index }] // Mock failed index
      }),
      ItemFailed: MockHelpers.createMockEvent({
        section: 'utility',
        method: 'ItemFailed'
      }),
      ExtrinsicSuccess: MockHelpers.createMockEvent({
        section: 'system',
        method: 'ExtrinsicSuccess'
      }),
      ExtrinsicFailed: MockHelpers.createMockEvent({
        section: 'system',
        method: 'ExtrinsicFailed'
      })
    };
  }

  static createUtilityEventTypes() {
    return {
      ItemCompleted: MockHelpers.createMockEventType('utility', 'ItemCompleted'),
      BatchCompleted: MockHelpers.createMockEventType('utility', 'BatchCompleted'),
      BatchCompletedWithErrors: MockHelpers.createMockEventType('utility', 'BatchCompletedWithErrors'),
      BatchInterrupted: MockHelpers.createMockEventType('utility', 'BatchInterrupted'),
      ItemFailed: MockHelpers.createMockEventType('utility', 'ItemFailed'),
      ExtrinsicSuccess: MockHelpers.createMockEventType('system', 'ExtrinsicSuccess'),
      ExtrinsicFailed: MockHelpers.createMockEventType('system', 'ExtrinsicFailed')
    };
  }

  static createBatchAllCall(innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
    return MockHelpers.createMockCall({
      section: 'utility',
      method: 'batchAll',
      args: [innerCalls]
    });
  }

  static createBatchCall(innerCalls: CallBase<AnyTuple>[]): CallBase<AnyTuple> {
    return MockHelpers.createMockCall({
      section: 'utility',
      method: 'batch',
      args: [innerCalls]
    });
  }

  static createTestCall(section: string = 'test', method: string = 'testCall'): CallBase<AnyTuple> {
    return MockHelpers.createMockCall({
      section,
      method,
      args: []
    });
  }

  static createTestEvent(section: string = 'test', method: string = 'TestEvent'): AnyEvent {
    return MockHelpers.createMockEvent({
      section,
      method,
      args: []
    });
  }
}