"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultKnownNodes = void 0;
exports.CreateCallWalk = CreateCallWalk;
const event_queue_1 = require("./event-queue");
const batchAll_1 = require("./nodes/utility/batchAll");
const forceBatch_1 = require("./nodes/utility/forceBatch");
const asMulti_1 = require("./nodes/multisig/asMulti");
const asMultiThreshold1_1 = require("./nodes/multisig/asMultiThreshold1");
const proxy_1 = require("./nodes/proxy/proxy");
const asDerivative_1 = require("./nodes/utility/asDerivative");
const batch_1 = require("./nodes/utility/batch");
exports.DefaultKnownNodes = [
    new batch_1.BatchNode(),
    new batchAll_1.BatchAllNode(),
    new forceBatch_1.ForceBatchNode(),
    new asDerivative_1.AsDerivativeNode(),
    new asMulti_1.AsMultiNode(),
    new asMultiThreshold1_1.AsMultiThreshold1Node(),
    new proxy_1.ProxyNode(),
];
function CreateCallWalk(nodes = exports.DefaultKnownNodes, customLogger) {
    return new CallWalkImpl(nodes, customLogger);
}
class CallWalkImpl {
    knowNodes;
    logger;
    constructor(knownNodes, logger) {
        this.knowNodes = knownNodes;
        this.logger = logger || {
            info: () => { },
            warn: () => { },
        };
    }
    async walk(source, visitor) {
        let events = source.events.map(e => e.event);
        let rootVisitedCall = {
            call: source.extrinsic.method,
            success: source.success,
            events: events,
            origin: source.extrinsic.signer.toString(),
            extrinsic: source,
        };
        await this.nestedVisit(visitor, rootVisitedCall, 0);
    }
    async nestedVisit(visitor, visitedCall, depth) {
        let call = visitedCall.call;
        let display = `${call.section}.${call.method}`;
        let origin = visitedCall.origin;
        this.logInfo(`Visiting node: ${display}, success: ${visitedCall.success}, origin: ${origin}`, depth + 1);
        let visitorContext = {
            stopped: false,
            stop: () => {
                visitorContext.stopped = true;
            },
        };
        await visitor.visit(visitedCall, visitorContext);
        if (visitorContext.stopped) {
            this.logInfo(`Visiting node ${display} has been stopped, origin: ${origin}`, depth + 1);
            return;
        }
        let nestedNode = this.findNestedNode(visitedCall.call);
        if (nestedNode) {
            let eventQueue = (0, event_queue_1.CreateEventQueue)(visitedCall.events);
            let nodeContext = {
                visitor: visitor,
                callSucceeded: visitedCall.success,
                eventQueue: eventQueue,
                origin: visitedCall.origin,
                extrinsic: visitedCall.extrinsic,
                nestedVisit: visitedCall => this.nestedVisit(visitor, visitedCall, depth + 1),
                endExclusiveToSkipInternalEvents: innerCall => {
                    return this.endExclusiveToSkipInternalEvents(innerCall, eventQueue, eventQueue.all().length);
                },
                logger: {
                    warn: content => this.logWarn(content, depth),
                    info: content => this.logInfo(content, depth),
                },
            };
            await nestedNode.visit(visitedCall.call, nodeContext);
        }
    }
    endExclusiveToSkipInternalEvents(call, eventQueue, endExclusive) {
        // Do not pass empty event queues to the batch nodes
        // we offload this check from them and only do it once - here
        if (eventQueue.all().length == 0) {
            return 0;
        }
        if (eventQueue.all(endExclusive).length == 0) {
            return endExclusive;
        }
        let nestedNode = this.findNestedNode(call);
        if (nestedNode != undefined) {
            let context = {
                eventQueue: eventQueue,
                endExclusive: endExclusive,
                endExclusiveToSkipInternalEvents: (innerCall, endExclusiveInner) => {
                    return this.endExclusiveToSkipInternalEvents(innerCall, eventQueue, endExclusiveInner);
                },
            };
            return nestedNode.endExclusiveToSkipInternalEvents(call, context);
        }
        else {
            // no internal events to skip since its a leaf
            return endExclusive;
        }
    }
    findNestedNode(call) {
        return this.knowNodes.find(node => node.canVisit(call));
    }
    logInfo(content, depth) {
        const indent = '  '.repeat(depth);
        this.logger.info(indent + content);
    }
    logWarn(content, depth) {
        const indent = '  '.repeat(depth);
        this.logger.warn(indent + content);
    }
}
