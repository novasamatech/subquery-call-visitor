import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
import { encodeMultiAddress, ethereumEncode, isEthereumAddress, createKeyMulti } from '@polkadot/util-crypto';

export const MultisigExecuted = api.events?.multisig?.MultisigExecuted;
export const MultisigApproval = api.events?.multisig?.MultisigApproval;
export const NewMultisig = api.events?.multisig?.NewMultisig;

export function generateMultisigAddress(origin: string, otherSignatories: IVec<AccountId>, threshold: number): string {
  const otherSignatoriesAddresses = otherSignatories.map(accountId => accountId.toString());
  const allAddresses = otherSignatoriesAddresses.concat(origin);

  if (isEthereumAddress(origin)) {
    return ethereumEncode(createKeyMulti(allAddresses, threshold).slice(0, 20));
  } else {
    return encodeMultiAddress(allAddresses, threshold, api.registry.chainSS58);
  }
}
