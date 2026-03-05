"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsMultiThreshold1Node = void 0;
const common_1 = require("./common");
class AsMultiThreshold1Node {
    canVisit(call) {
        return call.section == 'multisig' && call.method == 'asMultiThreshold1';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        let endExclusive = context.endExclusive;
        // asMultiThreshold1 does not emit any extra events and just transparently wraps nested call
        const innerCall = this.extractInnerMultisigCall(call);
        endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive);
        return endExclusive;
    }
    async visit(call, context) {
        if (!context.callSucceeded) {
            await this.visitFailedMultisigCall(call, context);
            context.logger.info('Multisig - failed or reverted by outer parent');
            return;
        }
        context.logger.info('Multisig - execution succeeded');
        await this.visitSucceededMultisigCall(call, context);
    }
    async visitFailedMultisigCall(call, context) {
        const visitedCall = {
            success: false,
            origin: this.extractMultisigOrigin(call, context.origin),
            call: this.extractInnerMultisigCall(call),
            events: [],
            extrinsic: context.extrinsic,
        };
        await context.nestedVisit(visitedCall);
    }
    async visitSucceededMultisigCall(call, context) {
        const visitedCall = {
            success: true,
            origin: this.extractMultisigOrigin(call, context.origin),
            call: this.extractInnerMultisigCall(call),
            events: context.eventQueue.all(),
            extrinsic: context.extrinsic,
        };
        await context.nestedVisit(visitedCall);
    }
    extractInnerMultisigCall(call) {
        return call.args[1];
    }
    extractMultisigOrigin(call, parentOrigin) {
        const [otherSignatories] = call.args;
        const threshold = 1;
        return (0, common_1.generateMultisigAddress)(parentOrigin, otherSignatories, threshold);
    }
}
exports.AsMultiThreshold1Node = AsMultiThreshold1Node;
