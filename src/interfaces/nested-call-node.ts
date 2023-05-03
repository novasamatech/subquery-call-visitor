import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {CallVisitor, VisitedCall} from "./call-visitor";
import {EventQueue} from "./event-queue";
import {SubstrateExtrinsic} from "@subql/types";

export interface NestedCallNode {

    canVisit(call: CallBase<AnyTuple>): boolean

    visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void>
}

export interface VisitingContext {

    origin: string

    extrinsic: SubstrateExtrinsic

    visitor: CallVisitor

    eventQueue: EventQueue

    logger: VisingLogger

    nestedVisit(visitedCall: VisitedCall): Promise<void>
}

export interface VisingLogger {

    info(content: string)

    warn(content: string)
}