import {NestedCallNode, VisitingContext} from "../interfaces";
import {CallVisitor, CallWalk, VisitedCall} from "../interfaces";
import {SubstrateExtrinsic} from "@subql/types";
import {BatchNode} from "./nodes/batch";
import {EventQueue} from "./event-queue";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types-codec/types";
import {Logger} from "pino"

const DefaultKnownNodes: NestedCallNode[] = [new BatchNode()]

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

        await this.nestedVisit(visitor, rootVisitedCall,  0)
    }

    private async nestedVisit(
        visitor: CallVisitor,
        visitedCall: VisitedCall,
        depth: number,
    ): Promise<void> {
        let nestedNode = this.findNestedNode(visitedCall.call)

        if (nestedNode == undefined) {
            // leaf node
            await visitor.visit(visitedCall)
        } else {

            let context: VisitingContext = {
                visitor: visitor,
                eventQueue: EventQueue(visitedCall.events),
                origin: visitedCall.origin,
                extrinsic: visitedCall.extrinsic,
                nestedVisit: (visitedCall) => this.nestedVisit(visitor, visitedCall, depth + 1),
                logger: {
                    warn: (content) => this.logWarn(content, depth),
                    info: (content) => this.logInfo(content, depth)
                }
            }

            await nestedNode.visit(visitedCall.call, context)
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