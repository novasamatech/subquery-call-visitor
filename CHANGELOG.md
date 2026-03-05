# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.4] - 2026-03-05

### Fixed

- Fixed multisig address generation for EVM origins in `generateMultisigAddress` by removing keccak-dependent helpers (`isEthereumAddress`, `ethereumEncode`) that can fail in SubQuery webpack runtimes with transitive `@noble/hashes` drift.
- Switched EVM detection to strict `^0x[0-9a-fA-F]{40}$` matching and EVM decoding to `addressToEvm(..., false)`.
- Switched EVM multisig output to `u8aToHex(multisigKey.slice(0, 20))` to avoid checksum/keccak code paths.

### Added

- Added regression tests for multisig address generation:
  - EVM origin path returns normalized `0x` lowercase hex output and matches expected key derivation.
  - Non-EVM path preserves SS58 address generation behavior.

### Documentation

- Added `AGENTS.md` 
