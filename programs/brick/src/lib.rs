#![deny(missing_docs)]

//! A brick.
//! Deploy in case of emergency.
//! anchor build --program-name brick ->
//! write to buffer -> set authority -> deploy

pub use solana_program;

solana_program::declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

pub mod entrypoint;
