import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
import { isEthereumAddress, ethereumEncode, createKeyMulti, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export const MultisigExecuted = api.events?.multisig?.MultisigExecuted;
export const MultisigApproval = api.events?.multisig?.MultisigApproval;
export const NewMultisig = api.events?.multisig?.NewMultisig;

export function generateMultisigAddress(origin: string, otherSignatories: IVec<AccountId>, threshold: number): string {
  const otherSignatoriesAddresses = otherSignatories.map(accountId => accountId.toString());
  const allAddresses = otherSignatoriesAddresses.concat(origin);

  if (isEthereumAddress(origin)) {
    return ethereumEncode(
      createKeyMulti(
        allAddresses.map(a => decodeAddress(a, true)),
        threshold,
      ).slice(0, 20),
    );
  } else {
    return encodeAddress(
      createKeyMulti(
        allAddresses.map(a => decodeAddress(a, true)),
        threshold,
      ),
      api.registry.chainSS58,
    );
  }
}
