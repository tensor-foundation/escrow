//removing from SDK so we dont get weird question

// async withdrawTswapOwnedSpl({
//   mint,
//   owner = TSWAP_OWNER,
//   cosigner = TSWAP_COSIGNER,
//   amount,
// }: {
//   mint: PublicKey;
//   owner?: PublicKey;
//   cosigner?: PublicKey;
//   amount: BN;
// }) {
//   const [tswapPda, tswapBump] = findTSwapPDA({});
//
//   const splSource = await getAssociatedTokenAddress(mint, tswapPda, true);
//   const splDest = await getAssociatedTokenAddress(mint, owner);
//
//   const builder = this.program.methods
//     .withdrawTswapOwnedSpl(amount)
//     .accounts({
//       tswap: tswapPda,
//       owner,
//       cosigner,
//       splSource,
//       splDest,
//       splMint: mint,
//       tokenProgram: TOKEN_PROGRAM_ID,
//       systemProgram: SystemProgram.programId,
//       rent: SYSVAR_RENT_PUBKEY,
//       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     });
//
//   return {
//     builder,
//     tx: { ixs: [await builder.instruction()] },
//     tswapPda,
//     tswapBump,
//     splSource,
//     splDest,
//   };
// }
