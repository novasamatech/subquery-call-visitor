import {AnyTuple} from "@polkadot/types-codec/types";
import {IsEvent} from "@polkadot/types/metadata/decorate/types";
import {AnyEvent} from "./types";

export interface EventQueue {

    all(): AnyEvent[]

    /**
     * Removes last event matching one of eventTypes
     */
    popFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[])

    /**
     * Takes and removes all events that go after last event matching one of eventTypes. If no matched event found,
     * all available events are returned
     */
    takeTail(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent[]

    /**
     * Takes and removes last event matching one of eventTypes
     */
    takeFromEnd(...eventTypes: IsEvent<AnyTuple, Object>[]): AnyEvent | undefined
}