# SubQuery Call Visitor

![npm](https://img.shields.io/npm/v/subquery-call-visitor)

Package that allows you to easily traverse nested Substrate calls

## Getting started

## Install package
``` shell
yarn add subquery-call-visitor
yarn install
```

## Setup visitor

```typescript
const callWalk = CreateCallWalk()

const visitor = CreateCallVisitorBuilder()
    .on("balances", "transfer", handleTransfer)
    .ignoreFailedCalls(true)
    .build()


async function handleTransfer(visitedCall: VisitedCall): Promise<void> {
   // your logic
}
```

## Register handlers

In order for SubQuery indexer to index nested calls you should add the following
to your project

1. Add a common handler

```typescript
export async function handleNestedCalls(extrinsic: SubstrateExtrinsic): Promise<void> {
    await callWalk.walk(extrinsic, visitor)
}
```

2. Register common handler in `project.yaml`:

```yaml
datasources:
  mapping:
  handlers:
  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: proxy
      method: proxy
      # you may add success flag if you want to visit only success root extrinsics
      success: true 

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: proxy
      method: proxyAnnounced
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: utility
      method: batch
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: utility
      method: batchAll
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: utility
      method: forceBatch
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: multisig
      method: asMulti
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: multisig
      method: asMultiThreshold1
      success: true

  - handler: handleNestedCalls
    kind: substrate/CallHandler
    filter:
      module: utility
      method: asDerivative
      success: true
```

# Development

You can use following command to update package as dependency in another project.
Note that you should remove `subquery-call-visitor` from `package.json` first.
```shell
npm link /<path_to_visitor_package>
```

This will crete symlink to `subquery-call-visitor` and allow applying changes in realtime

When you are done with development and want to switch back to remote version, run the following:
``` shell
npm unlink /<path_to_visitor_package>
```