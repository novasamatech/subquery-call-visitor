import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { CallVisitor, VisitedCall } from './call-visitor';
import { EventQueue, MutableEventQueue } from './event-queue';
import { SubstrateExtrinsic } from '@subql/types';

export interface NestedCallNode {
  canVisit(call: CallBase<AnyTuple>): boolean;

  /**
   * Calculates exclusive end index that is needed to skip all internal events related to this nested call
   * For example, utility.batch supposed to skip BatchCompleted/BatchInterrupted and all ItemCompleted events
   * This function is used by `visit` to skip internal events of nested nodes of the same type (batch inside batch or proxy inside proxy)
   * so they wont interfere
   * Should not be called on failed nested calls since they emit no events and its trivial to proceed
   */
  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number;

  visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void>;
}

export interface VisitingContext {
  origin: string;

  callSucceeded: boolean;

  extrinsic: SubstrateExtrinsic;

  visitor: CallVisitor;

  eventQueue: MutableEventQueue;

  logger: VisingLogger;

  nestedVisit(visitedCall: VisitedCall): Promise<void>;

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>): number;
}

export interface EventCountingContext {
  eventQueue: EventQueue;

  endExclusive: number;

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, endExclusive: number): number;
}

export interface VisingLogger {
  info(content: string): void;

  warn(content: string): void;
}
