"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCallVisitorBuilder = CreateCallVisitorBuilder;
function CreateCallVisitorBuilder() {
    return new CallVisitorBuilderImpl();
}
class CallVisitorBuilderImpl {
    handlers = {};
    _ignoreFailedCalls = true;
    build() {
        return new CallVisitorImpl(this.handlers, this._ignoreFailedCalls);
    }
    on(module, call, handler) {
        if (Array.isArray(call)) {
            for (const c of call) {
                this.handlers[createHandlerKey(module, c)] = handler;
            }
        }
        else {
            this.handlers[createHandlerKey(module, call)] = handler;
        }
        return this;
    }
    ignoreFailedCalls(ignore) {
        this._ignoreFailedCalls = ignore;
        return this;
    }
}
class CallVisitorImpl {
    handlers;
    ignoreFailedCalls;
    constructor(handlers, ignoreFailedCalls) {
        this.handlers = handlers;
        this.ignoreFailedCalls = ignoreFailedCalls;
    }
    async visit(call, context) {
        if (!call.success && this.ignoreFailedCalls)
            return;
        const handlerKey = createHandlerKey(call.call.section, call.call.method);
        const handler = this.handlers[handlerKey];
        if (handler != undefined) {
            await handler(call, context);
        }
    }
}
function createHandlerKey(module, call) {
    return `${module}.${call}`;
}
