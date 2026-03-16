import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
import { addressToEvm, createKeyMulti, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

export const MultisigExecuted = api.events?.multisig?.MultisigExecuted;
export const MultisigApproval = api.events?.multisig?.MultisigApproval;
export const NewMultisig = api.events?.multisig?.NewMultisig;

const EVM_REGEX = /^0x[0-9a-fA-F]{40}$/;

function safeDecodeAddress(address: string): Uint8Array {
  const trimmedAddress = address.trim();

  if (EVM_REGEX.test(trimmedAddress)) {
    return addressToEvm(trimmedAddress, false);
  }

  return decodeAddress(trimmedAddress, true);
}

export function generateMultisigAddress(origin: string, otherSignatories: IVec<AccountId>, threshold: number): string {
  const otherSignatoriesAddresses = otherSignatories.map(accountId => accountId.toString());
  const allAddresses = otherSignatoriesAddresses.concat(origin);
  const decoded = allAddresses.map(address => safeDecodeAddress(address));
  const multisigKey = createKeyMulti(decoded, threshold);

  if (EVM_REGEX.test(origin)) {
    return u8aToHex(multisigKey.slice(0, 20));
  }

  return encodeAddress(multisigKey, api.registry.chainSS58);
}
