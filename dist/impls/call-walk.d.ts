import { NestedCallNode } from '../interfaces';
import { CallWalk } from '../interfaces';
import { Logger } from 'pino';
export declare const DefaultKnownNodes: NestedCallNode[];
export declare function CreateCallWalk(nodes?: NestedCallNode[], customLogger?: Logger): CallWalk;
