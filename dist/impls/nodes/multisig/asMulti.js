"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsMultiNode = void 0;
const common_1 = require("./common");
const CompletionEvents = [common_1.MultisigExecuted, common_1.MultisigApproval, common_1.NewMultisig];
class AsMultiNode {
    canVisit(call) {
        return call.section == 'multisig' && call.method == 'asMulti';
    }
    endExclusiveToSkipInternalEvents(call, context) {
        let endExclusive = context.endExclusive;
        let completionItem = context.eventQueue.peekItemFromEnd(CompletionEvents, endExclusive);
        if (!completionItem)
            return 0;
        let [completionEvent, completionIdx] = completionItem;
        endExclusive = completionIdx;
        let result = this.getMultisigExecutedResult(completionEvent);
        if (common_1.MultisigExecuted?.is(completionEvent) && result.isOk) {
            const innerCall = this.extractInnerMultisigCall(call);
            endExclusive = context.endExclusiveToSkipInternalEvents(innerCall, endExclusive);
        }
        return endExclusive;
    }
    async visit(call, context) {
        if (!context.callSucceeded) {
            await this.visitFailedMultisigCall(call, context);
            context.logger.info('asMulti - reverted by outer parent');
            return;
        }
        const completionEvent = context.eventQueue.takeFromEnd(...CompletionEvents);
        if (completionEvent && common_1.MultisigExecuted?.is(completionEvent)) {
            const result = this.getMultisigExecutedResult(completionEvent);
            if (result.isOk) {
                context.logger.info('asMulti - execution succeeded');
                await this.visitSucceededMultisigCall(call, context);
            }
            else {
                context.logger.info('asMulti - execution failed');
                await this.visitFailedMultisigCall(call, context);
            }
        }
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
        return call.args[3];
    }
    extractMultisigOrigin(call, parentOrigin) {
        const [threshold, otherSignatories] = call.args;
        return (0, common_1.generateMultisigAddress)(parentOrigin, otherSignatories, threshold.toNumber());
    }
    getMultisigExecutedResult(event) {
        // @ts-expect-error Property 'result' does not exist on type 'AnyTuple & IEventData'
        return event.data.result || event.data.at(4);
    }
}
exports.AsMultiNode = AsMultiNode;
