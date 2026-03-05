"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewMultisig = exports.MultisigApproval = exports.MultisigExecuted = void 0;
exports.generateMultisigAddress = generateMultisigAddress;
const util_crypto_1 = require("@polkadot/util-crypto");
const util_1 = require("@polkadot/util");
exports.MultisigExecuted = api.events?.multisig?.MultisigExecuted;
exports.MultisigApproval = api.events?.multisig?.MultisigApproval;
exports.NewMultisig = api.events?.multisig?.NewMultisig;
const EVM_REGEX = /^0x[0-9a-fA-F]{40}$/;
function safeDecodeAddress(address) {
    const trimmedAddress = address.trim();
    if (EVM_REGEX.test(trimmedAddress)) {
        return (0, util_crypto_1.addressToEvm)(trimmedAddress, false);
    }
    return (0, util_crypto_1.decodeAddress)(trimmedAddress, true);
}
function generateMultisigAddress(origin, otherSignatories, threshold) {
    const otherSignatoriesAddresses = otherSignatories.map(accountId => accountId.toString());
    const allAddresses = otherSignatoriesAddresses.concat(origin);
    const decoded = allAddresses.map(address => safeDecodeAddress(address));
    const multisigKey = (0, util_crypto_1.createKeyMulti)(decoded, threshold);
    if (EVM_REGEX.test(origin)) {
        return (0, util_1.u8aToHex)(multisigKey.slice(0, 20));
    }
    return (0, util_crypto_1.encodeAddress)(multisigKey, api.registry.chainSS58);
}
