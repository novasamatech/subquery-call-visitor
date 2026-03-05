import { describe, expect, test } from '@jest/globals';
import { IVec } from '@polkadot/types-codec/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime/types';
import { u8aToHex } from '@polkadot/util';
import { addressToEvm, createKeyMulti, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { generateMultisigAddress } from './common';

function createOtherSignatories(addresses: string[]): IVec<AccountId> {
  return addresses.map(address => ({ toString: () => address })) as unknown as IVec<AccountId>;
}

describe('MultisigCommon', () => {
  test('shouldGenerateEvmMultisigAddressWithoutEthereumChecksumPath', () => {
    const origin = '0xAb58f5e249A6C1ECce4D4A9756B5f18af2649588';
    const otherSignatories = [
      '0x95a0B28fFa6fB8A81dE8e9f44fBfE6dBC53A7f95',
      '0x9a97C42Ff5f3722D4326DAfAa6Ab6Fd6f9C3D47B',
    ];

    const result = generateMultisigAddress(origin, createOtherSignatories(otherSignatories), 2);

    const decoded = [...otherSignatories, origin].map(address => addressToEvm(address, false));
    const multisigKey = createKeyMulti(decoded, 2);
    const expected = u8aToHex(multisigKey.slice(0, 20));

    expect(result).toBe(expected);
    expect(result).toMatch(/^0x[0-9a-f]{40}$/);
  });

  test('shouldPreserveSubstrateMultisigAddressGeneration', () => {
    const origin = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const otherSignatories = [
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    ];

    const result = generateMultisigAddress(origin, createOtherSignatories(otherSignatories), 2);

    const decoded = [...otherSignatories, origin].map(address => decodeAddress(address, true));
    const multisigKey = createKeyMulti(decoded, 2);
    const expected = encodeAddress(multisigKey, api.registry.chainSS58);

    expect(result).toBe(expected);
  });
});
