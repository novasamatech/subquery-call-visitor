import {AnyTuple} from "@polkadot/types-codec/types";
import {IsEvent} from "@polkadot/types/metadata/decorate/types";
import {EventQueue} from "../interfaces";
import {IEvent} from "@polkadot/types/types";
import {AnyEvent} from "../interfaces";

export function EventQueue(events: AnyEvent[]): EventQueue {
    return new EventQueueImpl(events)
}

class EventQueueImpl implements EventQueue {

    private readonly events: Array<AnyEvent>

    constructor(events: AnyEvent[]) {
        this.events = new Array(...events)
    }

    popFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[]) {
        this.takeFromEnd(...eventTypes)
    }

    takeFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent | undefined {
        const [event, eventIndex] = this.findEventAndIndex(...eventTypes)

        this.removeAllAfterInclusive(eventIndex)

        return event
    }

    takeTail(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent[] {
        const [_, eventIndex] = this.findEventAndIndex(...eventTypes)

        return this.removeAllAfterExclusive(eventIndex)
    }

    private findEventAndIndex<A extends AnyTuple>(...isEvents: IsEvent<A>[]): [IEvent<A>, number] | undefined {
        let eventsQueue = this.events

        for (let i = this.events.length - 1; i >= 0; i--) {
            const nextEvent = eventsQueue[i]

            for (const isEvent of isEvents) {
                if (isEvent.is(nextEvent)) {
                    return [nextEvent, i]
                }
            }
        }

        return undefined
    }

    private removeAllAfterInclusive(index: number) {
        const deleteCount = this.events.length - index

        if (deleteCount > 0) {
            this.events.splice(index, deleteCount)
        }
    }

    private removeAllAfterExclusive(index: number): AnyEvent[] {
        const deleteCount = this.events.length - index

        return this.events.splice(index + 1, deleteCount)
    }
}