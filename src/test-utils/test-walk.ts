import { CallWalk, CallVisitor, VisitedCall, NestedCallNode } from '../interfaces';
import { SubstrateExtrinsic } from '@subql/types';
import { CreateCallWalk } from '../impls/call-walk';
import { Logger } from 'pino';

interface TestWalkOptions {
  logger?: Logger;
}

export class TestWalk {
  private callWalk: CallWalk;
  private nodes: NestedCallNode[];

  constructor(nodes: NestedCallNode[], options: TestWalkOptions = {}) {
    // Create a silent logger for tests
    const testLogger = options.logger;

    this.nodes = nodes;
    this.callWalk = CreateCallWalk(
      nodes,
      testLogger
    );
  }

  async walkToList(extrinsic: SubstrateExtrinsic): Promise<VisitedCall[]> {
    const visitedCalls: VisitedCall[] = [];

    const visitor: CallVisitor = {
      visit: async (call: VisitedCall) => {
        // Determine if this call has a registered node (is a branch)
        const hasRegisteredNode = this.hasRegisteredNode(call);
        const enhancedCall = { ...call, hasRegisteredNode };
        visitedCalls.push(enhancedCall);
      }
    };

    await this.callWalk.walk(extrinsic, visitor);
    return visitedCalls;
  }

  async walkSingleIgnoringBranches(extrinsic: SubstrateExtrinsic): Promise<VisitedCall> {
    const visits = await this.walkToList(extrinsic);
    const leafVisits = this.ignoreBranches(visits);

    if (leafVisits.length !== 1) {
      throw new Error(`Expected single visit, got ${leafVisits.length}`);
    }

    return leafVisits[0]!;
  }

  async walkMultipleIgnoringBranches(extrinsic: SubstrateExtrinsic, expectedSize: number): Promise<VisitedCall[]> {
    const visits = await this.walkToList(extrinsic);
    const leafVisits = this.ignoreBranches(visits);

    if (leafVisits.length !== expectedSize) {
      throw new Error(`Expected ${expectedSize} visits, got ${leafVisits.length}`);
    }

    return leafVisits;
  }

  async walkEmpty(extrinsic: SubstrateExtrinsic): Promise<void> {
    const visits = await this.walkToList(extrinsic);
    const leafVisits = this.ignoreBranches(visits);

    if (leafVisits.length !== 0) {
      throw new Error(`Expected empty visits, got ${leafVisits.length}`);
    }
  }

  private ignoreBranches(visits: VisitedCall[]): VisitedCall[] {
    return visits.filter(visit => !(visit as any).hasRegisteredNode);
  }

  private hasRegisteredNode(call: VisitedCall): boolean {
    // Check if this call has a registered node by looking at the nodes
    return this.nodes.some(node => node.canVisit(call.call));
  }
}