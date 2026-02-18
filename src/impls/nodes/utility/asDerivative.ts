import { AnyEvent, EventCountingContext, NestedCallNode, VisitedCall, NodeContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { INumber } from '@polkadot/types-codec/types/interfaces';
import { decodeAddress, encodeAddress, createKeyDerived } from '@polkadot/util-crypto';

export class AsDerivativeNode implements NestedCallNode {
  canVisit(call: CallBase<AnyTuple>): boolean {
    return call.section == 'utility' && call.method == 'asDerivative';
  }

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
    let endExclusive = context.endExclusive;

    // asDerivative does not emit any extra events and just transparently wraps nested call
    const innerCall = this.extractInnerCall(call);
    endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive);

    return endExclusive;
  }

  async visit(call: CallBase<AnyTuple>, context: NodeContext): Promise<void> {
    if (!context.callSucceeded) {
      await this.visitFailedCall(call, context);
      context.logger.info('AsDerivative - failed or reverted by outer parent');
      return;
    }

    context.logger.info('AsDerivative - execution succeeded');

    await this.visitSucceededCall(call, context);
  }

  private async visitFailedCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void> {
    const success = false;
    const events: AnyEvent[] = [];

    await this.visitInnerCall(call, context, success, events);
  }

  private async visitSucceededCall(call: CallBase<AnyTuple>, context: NodeContext): Promise<void> {
    const success = true;
    const events = context.eventQueue.all();

    await this.visitInnerCall(call, context, success, events);
  }

  private async visitInnerCall(
    call: CallBase<AnyTuple>,
    context: NodeContext,
    success: boolean,
    events: AnyEvent[],
  ): Promise<void> {
    const visitedCall: VisitedCall = {
      success: success,
      origin: this.extractInnerOrigin(call, context.origin),
      call: this.extractInnerCall(call),
      events: events,
      extrinsic: context.extrinsic,
    };

    await context.nestedVisit(visitedCall);
  }

  private extractInnerCall(call: CallBase<AnyTuple>): CallBase<AnyTuple> {
    return call.args[1] as CallBase<AnyTuple>;
  }

  private extractInnerOrigin(call: CallBase<AnyTuple>, parentOrigin: string): string {
    const index = call.args[0] as INumber;

    return encodeAddress(createKeyDerived(decodeAddress(parentOrigin, true), index.toNumber()));
  }
}
