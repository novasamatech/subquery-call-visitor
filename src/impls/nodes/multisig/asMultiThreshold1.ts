import { EventCountingContext, NestedCallNode, VisitedCall, VisitingContext } from '../../../interfaces';
import { CallBase } from '@polkadot/types/types/calls';
import { AnyTuple } from '@polkadot/types-codec/types';
import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
import { generateMultisigAddress } from './common';

export class AsMultiThreshold1Node implements NestedCallNode {
  canVisit(call: CallBase<AnyTuple>): boolean {
    return call.section == 'multisig' && call.method == 'asMultiThreshold1';
  }

  endExclusiveToSkipInternalEvents(call: CallBase<AnyTuple>, context: EventCountingContext): number {
    let endExclusive = context.endExclusive;

    // asMultiThreshold1 does not emit any extra events and just transparently wraps nested call
    const innerCall = this.extractInnerMultisigCall(call);
    endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive);

    return endExclusive;
  }

  async visit(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
    if (!context.callSucceeded) {
      await this.visitFailedMultisigCall(call, context);
      context.logger.info('Multisig - failed or reverted by outer parent');
      return;
    }

    context.logger.info('Multisig - execution succeeded');

    await this.visitSucceededMultisigCall(call, context);
  }

  private async visitFailedMultisigCall(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
    const visitedCall: VisitedCall = {
      success: false,
      origin: this.extractMultisigOrigin(call, context.origin),
      call: this.extractInnerMultisigCall(call),
      events: [],
      extrinsic: context.extrinsic,
    };

    await context.nestedVisit(visitedCall);
  }

  private async visitSucceededMultisigCall(call: CallBase<AnyTuple>, context: VisitingContext): Promise<void> {
    const visitedCall: VisitedCall = {
      success: true,
      origin: this.extractMultisigOrigin(call, context.origin),
      call: this.extractInnerMultisigCall(call),
      events: context.eventQueue.all(),
      extrinsic: context.extrinsic,
    };

    await context.nestedVisit(visitedCall);
  }

  private extractInnerMultisigCall(call: CallBase<AnyTuple>): CallBase<AnyTuple> {
    return call.args[1] as CallBase<AnyTuple>;
  }

  private extractMultisigOrigin(call: CallBase<AnyTuple>, parentOrigin: string): string {
    const [otherSignatories] = call.args;
    const threshold = 1;

    return generateMultisigAddress(parentOrigin, otherSignatories as IVec<AccountId>, threshold);
  }
}
