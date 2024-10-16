<h1 align="center">
  Tensor Escrow
</h1>
<p align="center">
  <img width="400" alt="Tensor Escrow" src="https://github.com/tensor-foundation/margin/assets/729235/ff00ae1f-15f9-4248-8fa1-fdab50b1d6b4" />
</p>
<p align="center">
  Shared escrow for all Tensor protocols.
</p>

## Overview

The Tensor Foundation escrow program is a program that provides shared liquidity accounts for bids and pools on the Marketplace and AMM programs respectively.
It has the same program ID as `TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN` program but all of the pool and listing functionality has been removed leaving
only the shared escrow features.

## Status

The new Escrow program will be deployed to devnet on October 2nd, and to mainnet on November 2nd.

| Devnet | Mainnet |
| ------ | ------- |
| -      | -       |

## Programs

This project contains the following programs:

- [Escrow](./program/README.md) `TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN`

You will need a Rust version compatible with BPF to compile the program, currently we recommend using Rust 1.75.0.

## Clients

This project contains the following clients:

- [JavaScript](./clients/js/README.md)
- [Rust](./clients/rust/README.md)

## Contributing

Check out the [Contributing Guide](./CONTRIBUTING.md) the learn more about how to contribute to this project.

## Build

### Prerequisites

You need the following tools installed to build the project:

- pnpm v9+
- rust v1.78.0
- node v18+
- solana v1.17.23
- anchor v0.29.0

### Steps

Install JavaScript dependencies:

```bash
pnpm install
```

Build the program and generate the clients:

```bash
pnpm programs:build
pnpm generate
```

Run JS and Rust tests:

```bash
pnpm clients:js:test
pnpm clients:rust:test
```
