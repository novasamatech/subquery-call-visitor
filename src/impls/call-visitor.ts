import { CallHandler, CallVisitor, CallVisitorBuilder, VisitedCall, VisitorContext } from '../interfaces';

export function CreateCallVisitorBuilder(): CallVisitorBuilder {
  return new CallVisitorBuilderImpl();
}

class CallVisitorBuilderImpl implements CallVisitorBuilder {
  private handlers: Record<string, CallHandler> = {};
  private _ignoreFailedCalls: boolean = true;

  build(): CallVisitor {
    return new CallVisitorImpl(this.handlers, this._ignoreFailedCalls);
  }

  on(module: string, call: string | string[], handler: CallHandler): CallVisitorBuilder {
    if (Array.isArray(call)) {
      for (const c of call) {
        this.handlers[createHandlerKey(module, c)] = handler;
      }
    } else {
      this.handlers[createHandlerKey(module, call)] = handler;
    }

    return this;
  }

  ignoreFailedCalls(ignore: boolean): CallVisitorBuilder {
    this._ignoreFailedCalls = ignore;

    return this;
  }
}

class CallVisitorImpl implements CallVisitor {
  private readonly handlers: Record<string, CallHandler>;
  private readonly ignoreFailedCalls: boolean;

  constructor(handlers: Record<string, CallHandler>, ignoreFailedCalls: boolean) {
    this.handlers = handlers;
    this.ignoreFailedCalls = ignoreFailedCalls;
  }

  async visit(call: VisitedCall, context: VisitorContext): Promise<void> {
    if (!call.success && this.ignoreFailedCalls) return;

    const handlerKey = createHandlerKey(call.call.section, call.call.method);
    const handler = this.handlers[handlerKey];

    if (handler != undefined) {
      await handler(call, context);
    }
  }
}

function createHandlerKey(module: string, call: string): string {
  return `${module}.${call}`;
}
