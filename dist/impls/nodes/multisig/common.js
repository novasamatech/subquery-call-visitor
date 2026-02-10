"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewMultisig = exports.MultisigApproval = exports.MultisigExecuted = void 0;
exports.generateMultisigAddress = generateMultisigAddress;
const util_crypto_1 = require("@polkadot/util-crypto");
exports.MultisigExecuted = api.events?.multisig?.MultisigExecuted;
exports.MultisigApproval = api.events?.multisig?.MultisigApproval;
exports.NewMultisig = api.events?.multisig?.NewMultisig;
function generateMultisigAddress(origin, otherSignatories, threshold) {
    const otherSignatoriesAddresses = otherSignatories.map(accountId => accountId.toString());
    const allAddresses = otherSignatoriesAddresses.concat(origin);
    if ((0, util_crypto_1.isEthereumAddress)(origin)) {
        return (0, util_crypto_1.ethereumEncode)((0, util_crypto_1.createKeyMulti)(allAddresses.map(a => (0, util_crypto_1.decodeAddress)(a, true)), threshold).slice(0, 20));
    }
    else {
        return (0, util_crypto_1.encodeAddress)((0, util_crypto_1.createKeyMulti)(allAddresses.map(a => (0, util_crypto_1.decodeAddress)(a, true)), threshold), api.registry.chainSS58);
    }
}
