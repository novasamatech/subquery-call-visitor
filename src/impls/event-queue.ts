import { AnyTuple } from '@polkadot/types-codec/types';
import { IsEvent } from '@polkadot/types/metadata/decorate/types';
import { MutableEventQueue } from '../interfaces';
import { IEvent } from '@polkadot/types/types';
import { AnyEvent } from '../interfaces';

export function CreateEventQueue(events: AnyEvent[]): MutableEventQueue {
  return new EventQueueImpl(events);
}

class EventQueueImpl implements MutableEventQueue {
  private readonly events: Array<AnyEvent>;

  constructor(events: AnyEvent[]) {
    this.events = new Array(...events);
  }

  all(endExclusive?: number): AnyEvent[] {
    if (endExclusive !== undefined) {
      return this.events.slice(0, endExclusive);
    }
    return [...this.events];
  }

  peekItemFromEnd(eventTypes: IsEvent<AnyTuple, Object>[], endExclusive: number): [AnyEvent, number] | undefined {
    return this.findEventAndIndex(eventTypes, endExclusive);
  }

  indexOfLast(eventTypes: IsEvent<AnyTuple, Object>[], endExclusive: number): number | undefined {
    let result = this.findEventAndIndex(eventTypes, endExclusive);

    if (result != undefined) {
      return result[1];
    } else {
      return undefined;
    }
  }

  takeAllAfterInclusive(endInclusive: number): AnyEvent[] {
    return this.removeAllAfterInclusive(endInclusive);
  }

  popFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[]) {
    this.takeFromEnd(...eventTypes);
  }

  takeFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent | undefined {
    const eventAndIndex = this.findEventAndIndex(eventTypes);

    if (eventAndIndex != undefined) {
      const [event, eventIndex] = eventAndIndex;

      this.removeAllAfterInclusive(eventIndex);

      return event;
    } else {
      return undefined;
    }
  }

  takeTail(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent[] {
    const result = this.findEventAndIndex(eventTypes);

    if (result != undefined) {
      const [_, eventIndex] = result;

      return this.removeAllAfterExclusive(eventIndex);
    } else {
      return this.removeAllAfterInclusive(0);
    }
  }

  private findEventAndIndex<A extends AnyTuple>(
    isEvents: IsEvent<A>[],
    endExclusive: number = this.events.length,
  ): [IEvent<A>, number] | undefined {
    let eventsQueue = this.events;
    let limit = Math.min(endExclusive, this.events.length);

    for (let i = limit - 1; i >= 0; i--) {
      const nextEvent = eventsQueue[i];
      if (!nextEvent) continue;

      for (const isEvent of isEvents) {
        if (isEvent?.is(nextEvent)) {
          return [nextEvent, i];
        }
      }
    }

    return undefined;
  }

  private removeAllAfterInclusive(index: number): AnyEvent[] {
    const deleteCount = this.events.length - index;

    return this.events.splice(index, deleteCount);
  }

  private removeAllAfterExclusive(index: number): AnyEvent[] {
    const deleteCount = this.events.length - index;

    return this.events.splice(index + 1, deleteCount);
  }
}
