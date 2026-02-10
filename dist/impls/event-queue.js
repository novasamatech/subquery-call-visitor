"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEventQueue = CreateEventQueue;
function CreateEventQueue(events) {
    return new EventQueueImpl(events);
}
class EventQueueImpl {
    events;
    constructor(events) {
        this.events = new Array(...events);
    }
    all(endExclusive) {
        if (endExclusive !== undefined) {
            return this.events.slice(0, endExclusive);
        }
        return [...this.events];
    }
    peekItemFromEnd(eventTypes, endExclusive) {
        return this.findEventAndIndex(eventTypes, endExclusive);
    }
    indexOfLast(eventTypes, endExclusive) {
        let result = this.findEventAndIndex(eventTypes, endExclusive);
        if (result != undefined) {
            return result[1];
        }
        else {
            return undefined;
        }
    }
    takeAllAfterInclusive(endInclusive) {
        return this.removeAllAfterInclusive(endInclusive);
    }
    popFromEnd(...eventTypes) {
        this.takeFromEnd(...eventTypes);
    }
    takeFromEnd(...eventTypes) {
        const eventAndIndex = this.findEventAndIndex(eventTypes);
        if (eventAndIndex != undefined) {
            const [event, eventIndex] = eventAndIndex;
            this.removeAllAfterInclusive(eventIndex);
            return event;
        }
        else {
            return undefined;
        }
    }
    takeTail(...eventTypes) {
        const result = this.findEventAndIndex(eventTypes);
        if (result != undefined) {
            const [_, eventIndex] = result;
            return this.removeAllAfterExclusive(eventIndex);
        }
        else {
            return this.removeAllAfterInclusive(0);
        }
    }
    findEventAndIndex(isEvents, endExclusive = this.events.length) {
        let eventsQueue = this.events;
        let limit = Math.min(endExclusive, this.events.length);
        for (let i = limit - 1; i >= 0; i--) {
            const nextEvent = eventsQueue[i];
            if (!nextEvent)
                continue;
            for (const isEvent of isEvents) {
                if (isEvent?.is(nextEvent)) {
                    return [nextEvent, i];
                }
            }
        }
        return undefined;
    }
    removeAllAfterInclusive(index) {
        const deleteCount = this.events.length - index;
        return this.events.splice(index, deleteCount);
    }
    removeAllAfterExclusive(index) {
        const deleteCount = this.events.length - index;
        return this.events.splice(index + 1, deleteCount);
    }
}
