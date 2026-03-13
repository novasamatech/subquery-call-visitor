# subquery-call-visitor

TypeScript package for SubQuery indexers that lets you traverse nested Substrate calls inside a single extrinsic (for example `utility.batch`, `proxy.proxy`, `multisig.asMulti`) and run handlers on leaf calls as if they were top-level call handlers.

Goal: provide a single "walk" over the call tree, split `extrinsic.events` across nested calls as well as possible, and pass the effective `origin` to the handler (proxied / derivative / multisig origin).

## What the code does (tl;dr)

1. Takes a `SubstrateExtrinsic` (from `@subql/types`) and builds a root `VisitedCall`.
2. Recursively visits the call and its nested calls using a set of "nodes" (`NestedCallNode`) that know the semantics of specific wrapper pallets/calls (batch/proxy/multisig/...).
3. For each visited call, invokes a user-provided `CallVisitor` that matches on `call.section` + `call.method` and runs the registered `CallHandler`.

## Public API

Exported from `src/index.ts`:

- `CreateCallWalk(nodes?: NestedCallNode[], logger?: pino.Logger): CallWalk`
- `DefaultKnownNodes: NestedCallNode[]`
- `CreateCallVisitorBuilder(): CallVisitorBuilder`
- Interfaces: `CallWalk`, `CallVisitor`, `CallVisitorBuilder`, `VisitedCall`, `NestedCallNode`, `EventQueue`/`MutableEventQueue`, `AnyEvent`

Key types:

- `VisitedCall` (see `src/interfaces/call-visitor.ts`): `call`, `success`, `events`, `origin`, `extrinsic`
- `CallHandler`: `(call: VisitedCall, context: VisitorContext) => void | Promise<void>`
- `VisitorContext.stop()`: stops traversing the current call's descendants
- `ignoreFailedCalls(true|false)` (in the builder): defaults to `true`, so your `CallHandler` is not called for `VisitedCall.success === false` unless you disable it

## SubQuery mapping integration example

```ts
import { SubstrateExtrinsic } from '@subql/types';
import { CreateCallWalk, CreateCallVisitorBuilder, VisitedCall } from 'subquery-call-visitor';

const callWalk = CreateCallWalk(); // uses DefaultKnownNodes

const visitor = CreateCallVisitorBuilder()
  .on('balances', 'transfer', onTransfer)
  .ignoreFailedCalls(true)
  .build();

export async function handleNestedCalls(extrinsic: SubstrateExtrinsic): Promise<void> {
  await callWalk.walk(extrinsic, visitor);
}

async function onTransfer(call: VisitedCall): Promise<void> {
  // call.call.section/method
  // call.origin
  // call.events
  // call.success
  // call.extrinsic (root extrinsic)
}
```

Note (SubQuery): to see nested calls at all, register `handleNestedCalls` as a handler for wrapper extrinsics (proxy/utility/multisig, etc.) in `project.yaml` (see `README.md` for an example).

## Node and logging customization

- `CreateCallWalk(nodes, logger)` accepts an explicit list of `NestedCallNode`. Passing `nodes` replaces `DefaultKnownNodes` entirely (include the defaults you still need).
- Node selection is "first match" (`find(node => node.canVisit(call))`), so ordering matters. You can override a default node by putting your custom node earlier.
- `logger` is optional; if provided (a `pino` logger), `CallWalk` logs `info/warn` with indentation by traversal depth.

## Traversal model (how it works)

### 1) Root

`CallWalk.walk(source, visitor)` (see `src/impls/call-walk.ts`) does:

- `events = source.events.map(e => e.event)`
- `rootVisitedCall.call = source.extrinsic.method`
- `rootVisitedCall.success = source.success`
- `rootVisitedCall.origin = source.extrinsic.signer.toString()`
- `rootVisitedCall.extrinsic = source`

Then it starts the recursion: `nestedVisit(visitor, rootVisitedCall, depth=0)`.

### 2) visitor -> branch node -> inner calls

`nestedVisit`:

1. Calls `visitor.visit(visitedCall, visitorContext)` first.
2. If `visitorContext.stop()` is called, traversal of this branch stops.
3. If the current call is a "branch" (a `NestedCallNode` with `canVisit(call) === true` is found), it creates an `EventQueue` from `visitedCall.events` and passes control to `nestedNode.visit(call, nodeContext)`.
4. The node (`NestedCallNode`) builds one or more `VisitedCall` objects for the inner calls and calls `nodeContext.nestedVisit(visitedCall)`.

Important: the wrapper call itself is still passed to `visitor.visit`, so you can also handle wrappers if you need to.

### 3) Assigning events to inner calls

Wrapper nodes use `MutableEventQueue` (see `src/impls/event-queue.ts`), which:

- stores an in-memory array of events and can "consume" the tail;
- can search for marker events from the end (`peekItemFromEnd`, `indexOfLast`, `takeFromEnd`, `takeTail`).

In this codebase most wrappers emit their completion markers close to the end of `extrinsic.events`, so nodes usually carve out event slices by walking backwards.

### 4) endExclusiveToSkipInternalEvents (nested wrappers of the same type)

Some wrappers can nest into themselves (batch inside batch, proxy inside proxy). To prevent the inner wrapper's markers from confusing the outer wrapper, there is a protocol:

- `NestedCallNode.endExclusiveToSkipInternalEvents(call, context)` returns an `endExclusive` index that limits where it is safe to search for markers, skipping internal events of nested wrappers.
- `CallWalkImpl.endExclusiveToSkipInternalEvents(...)` recursively delegates this calculation to the correct node for a given `call` and is used by nodes before slicing the queue.

## Implemented NestedCallNode wrappers

Default list: `DefaultKnownNodes` in `src/impls/call-walk.ts`.

### utility.*

- `utility.batch` (`BatchNode`): visits batch items; finds the "last successful index" using `BatchCompleted` / `BatchInterrupted`.
- `utility.batchAll` (`BatchAllNode`): either all inner calls are `success=true` or all are `success=false` (when the wrapper fails/reverts).
- `utility.forceBatch` (`ForceBatchNode`): uses `BatchCompleted` / `BatchCompletedWithErrors` and per-item `ItemCompleted` / `ItemFailed`.
- `utility.asDerivative` (`AsDerivativeNode`): transparent wrapper for the inner call, but changes `origin` to the derived address (`createKeyDerived`).

Compatibility with old runtimes: if `utility.ItemCompleted` / `utility.ItemFailed` do not exist, per-item event separation is impossible. In this mode `takeCompletedBatchItemEvents(...)` returns a wider event set (potentially shared across items) so the indexer can still find what it needs using additional filters.

### proxy.*

- `proxy.proxy` and `proxy.proxyAnnounced` (`ProxyNode`): determines inner call success via `proxy.ProxyExecuted` and `DispatchResult.isOk`. Replaces `origin` with the "real" account from the proxy call arguments.

### multisig.*

- `multisig.asMulti` (`AsMultiNode`): the inner call is considered executed only when a `multisig.MultisigExecuted` event is present and its `DispatchResult.isOk` is true. If only `NewMultisig` / `MultisigApproval` is present at the end, the inner call has not executed yet and does not show up as a visited inner call.
- `multisig.asMultiThreshold1` (`AsMultiThreshold1Node`): transparent wrapper for the inner call; replaces `origin` with the multisig address.

The multisig address is computed by `generateMultisigAddress(...)` (see `src/impls/nodes/multisig/common.ts`), including Ethereum address support.

## Repository layout

- `src/index.ts`: package entrypoint (imports `@polkadot/api-augment` and re-exports interfaces/implementations)
- `src/interfaces/*`: contracts (`VisitedCall`, `CallVisitor`, `NestedCallNode`, `EventQueue`, etc.)
- `src/impls/call-walk.ts`: recursive traversal, node selection, logging
- `src/impls/call-visitor.ts`: builder for registering handlers by `module.method`
- `src/impls/event-queue.ts`: event queue implementation used by nodes
- `src/impls/nodes/*`: wrapper-node implementations by pallet
- `src/test-utils/*`: mocks for extrinsic/call/event and `TestWalk` for unit tests

## Key dependencies and runtime environment

- The package targets the SubQuery mapping environment, where a global `api` (polkadot-js API) is available.
- Nodes read event constructors from `api.events.<pallet>.<EventName>`. Tests mock this in `src/test-utils/setup.ts`.
- Logging: `CreateCallWalk(..., logger)` accepts a `pino` logger; by default the logger is silent.

## Development commands

- Install: `pnpm install`
- Build: `pnpm run build` (outputs to `dist/`)
- Test: `pnpm test` (Jest + `junit.xml`)

CI in `.github/workflows/test_run_on_pr.yml` runs `pnpm run build` and `pnpm test` on Node `20` and `22`.

## How node tests are structured

- Tests use Jest (`ts-jest`); config: `jest.config.js`.
- Global `api` is mocked in `src/test-utils/setup.ts` (wired via `setupFilesAfterEnv`).

Main helpers:

- `MockHelpers`: creates mock calls/events/extrinsics.
- `TestWalk`: runs `CreateCallWalk` with a chosen set of nodes and returns the list of visits; `walk*IgnoringBranches` filters out wrapper calls (branches) leaving leaf visited calls.

If you add a node that reads `api.events.<pallet>.*`, you will almost certainly need to extend the `api` mock in `src/test-utils/setup.ts` for that pallet.

## Adding a new wrapper node (AI agent checklist)

1. Implement `NestedCallNode` in `src/impls/nodes/<pallet>/<call>.ts` (`canVisit`, `visit`, `endExclusiveToSkipInternalEvents`).
2. In `canVisit`, match `call.section` and `call.method` precisely.
3. In `visit`, respect `context.callSucceeded`: if the wrapper was reverted by an outer parent, inner calls should be `success=false` and usually have no events.
4. In `visit`, split `context.eventQueue` across inner calls by consuming events from the tail (`takeFromEnd`, `takeTail`, `takeAllAfterInclusive`).
5. For each inner call, call `context.nestedVisit({ call, success, events, origin, extrinsic })`.
6. If the wrapper can nest into itself, implement `endExclusiveToSkipInternalEvents` and use `context.endExclusiveToSkipInternalEvents(innerCall, endExclusive)` to recursively skip internal events.
7. Export the node from `src/impls/index.ts`.
8. If it should work out of the box, add it to `DefaultKnownNodes` in `src/impls/call-walk.ts`.
9. Add unit tests (happy path, fail path, nesting) following `src/impls/nodes/utility/*.test.ts`, using `MockHelpers` and `TestWalk`.
10. If the node reads new `api.events.*`, extend the mock in `src/test-utils/setup.ts`.
11. Run `pnpm run build` and `pnpm test`.

## Common pitfalls

- `VisitedCall.success` on leaf nodes usually means "this call and all its parents succeeded". If a wrapper is reverted by an outer parent, its descendants must be treated as `success=false`.
- On older blocks some events (like `ItemCompleted`) may not exist; batch nodes already cover this mode in tests.
- `VisitedCall.events` can be wider than "only events for this exact call" (see the comment on `VisitedCall.events` in the interface); handlers should still apply additional filters to find the exact events they need.
- The code relies on a global `api` and `.is(...)` checks for event types; always assume `api.events.<...>` can be `undefined` across runtimes.

## Troubleshooting

1. `Error: Uint8Array expected` on Moonbeam/Moonriver while handling multisig/proxy flows

   Symptoms:
   - indexer fails on EVM-compatible chains in paths that resolve or validate Ethereum addresses;
   - stack traces often include `isEthereumAddress`, `ethereumEncode`, `keccakAsU8a`, and `@noble/hashes`.

   Why this appears after dependency drift:
   - `@polkadot/util-crypto` depends on `@noble/hashes` via a semver range (`^1.3.3`);
   - when lockfiles drift, newer `@noble/hashes` (1.7+) may be selected, which uses stricter byte checks;
   - in SubQuery's webpack runtime, cross-realm `Uint8Array` values can fail these checks in JS hash fallback;
   - WASM crypto may be unavailable at runtime (`isReady() === false`), so execution reaches the failing JS fallback.

   Why this library was affected:
   - `generateMultisigAddress` previously used `isEthereumAddress` and `ethereumEncode`, both of which may trigger keccak-based checksum logic and hit the failing path.

   Fix in this repository:
   - EVM detection now uses strict regex `^0x[0-9a-fA-F]{40}$` (no checksum verification calls);
   - address decoding now uses a safe path: EVM -> `addressToEvm(..., false)`, non-EVM -> `decodeAddress(..., true)`;
   - EVM multisig output now uses `u8aToHex(multisigKey.slice(0, 20))` instead of `ethereumEncode`.

   Operational guidance:
   - if the same error appears again, inspect stack traces first and locate the exact keccak caller;
   - if the caller is outside this library, apply the same "no checksum/keccak on EVM normalization paths" approach there;
   - after upgrading `subquery-call-visitor`, re-run EVM-chain regression tests because lockfile drift can reintroduce this class of issue in other packages.
