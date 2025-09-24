import { AnyTuple } from '@polkadot/types-codec/types';
import { IsEvent } from '@polkadot/types/metadata/decorate/types';
import { AnyEvent } from './types';

export interface MutableEventQueue extends EventQueue {
  /**
   * Removes last event matching one of eventTypes
   */
  popFromEnd(...eventTypes: IsEvent<AnyTuple>[]): void;

  /**
   * Takes and removes all events that go after last event matching one of eventTypes. If no matched event found,
   * all available events are returned
   */
  takeTail(...eventTypes: IsEvent<AnyTuple>[]): AnyEvent[];

  /**
   * Takes and removes all events that go after specified inclusive index
   * @param endInclusive
   */
  takeAllAfterInclusive(endInclusive: number): AnyEvent[];

  /**
   * Takes and removes last event matching one of eventTypes
   */
  takeFromEnd(...eventTypes: IsEvent<AnyTuple>[]): AnyEvent | undefined;
}

export interface EventQueue {
  all(endExclusive?: number): AnyEvent[];

  peekItemFromEnd(eventTypes: IsEvent<AnyTuple>[], endExclusive: number): [AnyEvent, number] | undefined;

  indexOfLast(eventTypes: IsEvent<AnyTuple>[], endExclusive: number): number | undefined;
}
