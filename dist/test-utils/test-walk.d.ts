import { VisitedCall, NestedCallNode } from '../interfaces';
import { SubstrateExtrinsic } from '@subql/types';
import { Logger } from 'pino';
interface TestWalkOptions {
    logger?: Logger;
}
export declare class TestWalk {
    private callWalk;
    private nodes;
    constructor(nodes: NestedCallNode[], options?: TestWalkOptions);
    walkToList(extrinsic: SubstrateExtrinsic): Promise<VisitedCall[]>;
    walkSingleIgnoringBranches(extrinsic: SubstrateExtrinsic): Promise<VisitedCall>;
    walkMultipleIgnoringBranches(extrinsic: SubstrateExtrinsic, expectedSize: number): Promise<VisitedCall[]>;
    walkEmpty(extrinsic: SubstrateExtrinsic): Promise<void>;
    private ignoreBranches;
    private hasRegisteredNode;
}
export {};
