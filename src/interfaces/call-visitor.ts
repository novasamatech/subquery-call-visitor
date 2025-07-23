import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types/types/codec';
import { SubstrateExtrinsic } from '@subql/types';
import { AnyEvent } from './types';

export interface CallWalk {
  walk(source: SubstrateExtrinsic, visitor: CallVisitor): Promise<void>;
}

export interface VisitorContext {
  stopped: boolean;
  stop(): void;
}

export type CallHandler = (call: VisitedCall, context: VisitorContext) => void | Promise<void>;

export interface CallVisitor {
  visit: CallHandler;
}

export interface CallVisitorBuilder {
  on(module: string, calls: string | string[], handler: CallHandler): CallVisitorBuilder;
  ignoreFailedCalls(ignore: boolean): CallVisitorBuilder;
  build(): CallVisitor;
}

export interface VisitedCall {
  /**
   * Call that is currently visiting
   */
  call: CallBase<AnyTuple>;

  /**
   * Whether call succeeded or not.
   * Call is considered successful when it succeeds itself as well as its outer parents succeeds
   */
  success: boolean;

  /**
   * All events that are related to this specific call
   */
  events: AnyEvent[];

  /**
   * Origin's address that this call has been dispatched with
   */
  origin: string;

  /**
   * Reference to root extrinsic
   */
  extrinsic: SubstrateExtrinsic;
}
