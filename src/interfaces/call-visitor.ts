import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import {SubstrateExtrinsic} from "@subql/types";
import {AnyEvent} from "./types";

export interface CallWalk {

    walk(source: SubstrateExtrinsic, visitor: CallVisitor): Promise<void>
}

export interface CallVisitor {

    visit(call: VisitedCall): Promise<void>
}

export type CallHandler = (VisitedCall) => Promise<void>

export interface CallVisitorBuilder {

    on(module: string, call: string, handler: (VisitedCall) => Promise<void>): CallVisitorBuilder

    ignoreFailedCalls(ignore: boolean): CallVisitorBuilder

    build(): CallVisitor
}

export interface VisitedCall {

    call: CallBase<AnyTuple>

    success: boolean

    events: AnyEvent[]

    origin: string

    extrinsic: SubstrateExtrinsic
}