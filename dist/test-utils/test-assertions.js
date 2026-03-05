"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAssertions = void 0;
const globals_1 = require("@jest/globals");
const mock_helpers_1 = require("./mock-helpers");
class TestAssertions {
    static expectSignerEquals(actual, expected) {
        (0, globals_1.expect)(actual).toBe(mock_helpers_1.MockHelpers.signerToString(expected));
    }
}
exports.TestAssertions = TestAssertions;
