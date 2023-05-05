import {EventCountingContext, MutableEventQueue, NestedCallNode, VisitingContext} from "../interfaces";
import {CallVisitor, CallWalk, VisitedCall} from "../interfaces";
import {SubstrateExtrinsic} from "@subql/types";
import {BatchNode} from "./nodes/batch/batch";
import {CreateEventQueue} from "./event-queue";
import {EventQueue} from "../interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {Logger} from "pino"
import {BatchAllNode} from "./nodes/batch/batchAll";
import {ForceBatchNode} from "./nodes/batch/forceBatch";
import {AsMultiNode} from "./nodes/multisig/asMulti";
import {AsMultiThreshold1Node} from "./nodes/multisig/asMultiThreshold1";
import {ProxyNode} from "./nodes/proxy/proxy";

export const DefaultKnownNodes: NestedCallNode[] = [
    new BatchNode(), new BatchAllNode(), new ForceBatchNode(),
    new AsMultiNode(), new AsMultiThreshold1Node(),
    new ProxyNode()
]

export function CreateCallWalk(
    nodes: NestedCallNode[] = DefaultKnownNodes,
    customLogger: Logger = logger
): CallWalk {
    return new CallWalkImpl(nodes, customLogger)
}

class CallWalkImpl implements CallWalk {

    private readonly knowNodes: NestedCallNode[]

    private readonly logger: Logger

    constructor(knownNodes: NestedCallNode[], logger: Logger) {
        this.knowNodes = knownNodes
        this.logger = logger
    }

    async walk(source: SubstrateExtrinsic, visitor: CallVisitor): Promise<void> {
        let events = source.events.map((e) => e.event);

        let rootVisitedCall: VisitedCall = {
            call: source.extrinsic.method,
            success: source.success,
            events: events,
            origin: source.extrinsic.signer.toString(),
            extrinsic: source
        }

        await this.nestedVisit(visitor, rootVisitedCall, 0)
    }

    private async nestedVisit(
        visitor: CallVisitor,
        visitedCall: VisitedCall,
        depth: number,
    ): Promise<void> {
        let nestedNode = this.findNestedNode(visitedCall.call)

        if (nestedNode == undefined) {
            let call = visitedCall.call
            let display = `${call.section}.${call.method}`
            let origin = visitedCall.origin
            this.logInfo(`Visiting leaf: ${display}, success: ${visitedCall.success}, origin: ${origin}`, depth + 1)

            // leaf node
            await visitor.visit(visitedCall)
        } else {
            let eventQueue = CreateEventQueue(visitedCall.events);

            let context: VisitingContext = {
                visitor: visitor,
                callSucceeded: visitedCall.success,
                eventQueue: eventQueue,
                origin: visitedCall.origin,
                extrinsic: visitedCall.extrinsic,
                nestedVisit: (visitedCall) => this.nestedVisit(visitor, visitedCall, depth + 1),
                endExclusiveToSkipInternalEvents: (innerCall) => {
                    return this.endExclusiveToSkipInternalEvents(innerCall, eventQueue, visitedCall.events.length)
                },
                logger: {
                    warn: (content) => this.logWarn(content, depth),
                    info: (content) => this.logInfo(content, depth)
                }
            }

            await nestedNode.visit(visitedCall.call, context)
        }
    }

    private endExclusiveToSkipInternalEvents(
        call: CallBase<AnyTuple>,
        eventQueue: EventQueue,
        endExclusive: number,
    ): number {
        let nestedNode = this.findNestedNode(call)

        if (nestedNode != undefined) {
            let context: EventCountingContext = {
                eventQueue: eventQueue,
                endExclusive: endExclusive,
                endExclusiveToSkipInternalEvents: (innerCall, endExclusiveInner) => {
                    return this.endExclusiveToSkipInternalEvents(innerCall, eventQueue, endExclusiveInner)
                }
            }

            return nestedNode.endExclusiveToSkipInternalEvents(call, context)
        } else {
            // no internal events to skip since its a leaf
            return endExclusive
        }
    }

    private findNestedNode(call: CallBase<AnyTuple>): NestedCallNode | undefined {
        return this.knowNodes.find((node) => node.canVisit(call))
    }

    logInfo(content: string, depth: number) {
        const indent = "  ".repeat(depth)
        this.logger.info(indent + content)
    }

    logWarn(content: string, depth: number) {
        const indent = "  ".repeat(depth)
        this.logger.warn(indent + content)
    }
}