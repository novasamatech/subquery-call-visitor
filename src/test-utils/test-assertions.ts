import { expect } from '@jest/globals';
import { MockHelpers } from './mock-helpers';

export class TestAssertions {
  static expectSignerEquals(actual: string, expected: string | Uint8Array): void {
    expect(actual).toBe(MockHelpers.signerToString(expected));
  }
}