"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestWalk = void 0;
const call_walk_1 = require("../impls/call-walk");
class TestWalk {
    callWalk;
    nodes;
    constructor(nodes, options = {}) {
        // Create a silent logger for tests
        const testLogger = options.logger;
        this.nodes = nodes;
        this.callWalk = (0, call_walk_1.CreateCallWalk)(nodes, testLogger);
    }
    async walkToList(extrinsic) {
        const visitedCalls = [];
        const visitor = {
            visit: async (call) => {
                // Determine if this call has a registered node (is a branch)
                const hasRegisteredNode = this.hasRegisteredNode(call);
                const enhancedCall = { ...call, hasRegisteredNode };
                visitedCalls.push(enhancedCall);
            }
        };
        await this.callWalk.walk(extrinsic, visitor);
        return visitedCalls;
    }
    async walkSingleIgnoringBranches(extrinsic) {
        const visits = await this.walkToList(extrinsic);
        const leafVisits = this.ignoreBranches(visits);
        if (leafVisits.length !== 1) {
            throw new Error(`Expected single visit, got ${leafVisits.length}`);
        }
        return leafVisits[0];
    }
    async walkMultipleIgnoringBranches(extrinsic, expectedSize) {
        const visits = await this.walkToList(extrinsic);
        const leafVisits = this.ignoreBranches(visits);
        if (leafVisits.length !== expectedSize) {
            throw new Error(`Expected ${expectedSize} visits, got ${leafVisits.length}`);
        }
        return leafVisits;
    }
    async walkEmpty(extrinsic) {
        const visits = await this.walkToList(extrinsic);
        const leafVisits = this.ignoreBranches(visits);
        if (leafVisits.length !== 0) {
            throw new Error(`Expected empty visits, got ${leafVisits.length}`);
        }
    }
    ignoreBranches(visits) {
        return visits.filter(visit => !visit.hasRegisteredNode);
    }
    hasRegisteredNode(call) {
        // Check if this call has a registered node by looking at the nodes
        return this.nodes.some(node => node.canVisit(call.call));
    }
}
exports.TestWalk = TestWalk;
