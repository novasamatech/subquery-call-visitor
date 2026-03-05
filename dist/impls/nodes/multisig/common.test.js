"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
const common_1 = require("./common");
function createOtherSignatories(addresses) {
    return addresses.map(address => ({ toString: () => address }));
}
(0, globals_1.describe)('MultisigCommon', () => {
    (0, globals_1.test)('shouldGenerateEvmMultisigAddressWithoutEthereumChecksumPath', () => {
        const origin = '0xAb58f5e249A6C1ECce4D4A9756B5f18af2649588';
        const otherSignatories = [
            '0x95a0B28fFa6fB8A81dE8e9f44fBfE6dBC53A7f95',
            '0x9a97C42Ff5f3722D4326DAfAa6Ab6Fd6f9C3D47B',
        ];
        const result = (0, common_1.generateMultisigAddress)(origin, createOtherSignatories(otherSignatories), 2);
        const decoded = [...otherSignatories, origin].map(address => (0, util_crypto_1.addressToEvm)(address, false));
        const multisigKey = (0, util_crypto_1.createKeyMulti)(decoded, 2);
        const expected = (0, util_1.u8aToHex)(multisigKey.slice(0, 20));
        (0, globals_1.expect)(result).toBe(expected);
        (0, globals_1.expect)(result).toMatch(/^0x[0-9a-f]{40}$/);
    });
    (0, globals_1.test)('shouldPreserveSubstrateMultisigAddressGeneration', () => {
        const origin = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const otherSignatories = [
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        ];
        const result = (0, common_1.generateMultisigAddress)(origin, createOtherSignatories(otherSignatories), 2);
        const decoded = [...otherSignatories, origin].map(address => (0, util_crypto_1.decodeAddress)(address, true));
        const multisigKey = (0, util_crypto_1.createKeyMulti)(decoded, 2);
        const expected = (0, util_crypto_1.encodeAddress)(multisigKey, api.registry.chainSS58);
        (0, globals_1.expect)(result).toBe(expected);
    });
});
