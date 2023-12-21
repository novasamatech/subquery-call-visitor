import {IVec} from "@polkadot/types-codec/types/interfaces";
import {AccountId} from "@polkadot/types/interfaces/runtime/types";
import {encodeMultiAddress, encodeAddress, decodeAddress, ethereumEncode, isEthereumAddress} from "@polkadot/util-crypto";
import { u8aSorted, hexToU8a, isHex, isString, isU8a, u8aToU8a } from '@polkadot/util';
import type { AnyString, AnyU8a } from '@polkadot/types-codec/types';

export const MultisigExecuted = api.events.multisig.MultisigExecuted
export const MultisigApproval = api.events.multisig.MultisigApproval
export const NewMultisig = api.events.multisig.NewMultisig

function decodeAccountId (value: AnyU8a | AnyString): Uint8Array {
    if (isU8a(value) || Array.isArray(value)) {
      return u8aToU8a(value);
    } else if (isHex(value) || isEthereumAddress(value.toString())) {
      return hexToU8a(value.toString());
    } else if (isString(value)) {
      return u8aToU8a(value);
    }
  
    return value;
  }

export function generateMultisigAddress(
    origin: string,
    otherSignatories: IVec<AccountId>,
    threshold: number,
): string {
    const isEthereum = isEthereumAddress(origin)

    const otherSignatoriesAddresses = otherSignatories.map((accountId) => accountId.toString())
    const allAddresses = otherSignatoriesAddresses.concat(origin)
    const sortedAddresses = u8aSorted(
        allAddresses.map((who) => isEthereum ? decodeAccountId(who) : decodeAddress(who))
      ).map((who) =>  isEthereum ? ethereumEncode(who) : encodeAddress(who));

    return encodeMultiAddress(sortedAddresses, threshold, api.registry.chainSS58)
}