"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsDerivativeNode = void 0;
const util_crypto_1 = require("@polkadot/util-crypto");
class AsDerivativeNode {
    canVisit(call) {
        return call.section == 'utility' && call.method == 'asDerivative';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        let endExclusive = context.endExclusive;
        // asDerivative does not emit any extra events and just transparently wraps nested call
        const innerCall = this.extractInnerCall(call);
        endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive);
        return endExclusive;
    }
    async visit(call, context) {
        if (!context.callSucceeded) {
            await this.visitFailedCall(call, context);
            context.logger.info('AsDerivative - failed or reverted by outer parent');
            return;
        }
        context.logger.info('AsDerivative - execution succeeded');
        await this.visitSucceededCall(call, context);
    }
    async visitFailedCall(call, context) {
        const success = false;
        const events = [];
        await this.visitInnerCall(call, context, success, events);
    }
    async visitSucceededCall(call, context) {
        const success = true;
        const events = context.eventQueue.all();
        await this.visitInnerCall(call, context, success, events);
    }
    async visitInnerCall(call, context, success, events) {
        const visitedCall = {
            success: success,
            origin: this.extractInnerOrigin(call, context.origin),
            call: this.extractInnerCall(call),
            events: events,
            extrinsic: context.extrinsic,
        };
        await context.nestedVisit(visitedCall);
    }
    extractInnerCall(call) {
        return call.args[1];
    }
    extractInnerOrigin(call, parentOrigin) {
        const index = call.args[0];
        return (0, util_crypto_1.encodeAddress)((0, util_crypto_1.createKeyDerived)((0, util_crypto_1.decodeAddress)(parentOrigin, true), index.toNumber()));
    }
}
exports.AsDerivativeNode = AsDerivativeNode;
