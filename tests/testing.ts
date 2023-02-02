import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Testing } from "../target/types/testing";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";

describe("testing", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Testing as Program<Testing>;
  const connection = program.provider.connection;

  // Helper function to send a v0 transaction
  const createAndSendV0Tx = async (txInstructions: anchor.web3.TransactionInstruction[]) => {
    const latestBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new anchor.web3.TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: txInstructions,
    }).compileToV0Message();

    const transaction = new anchor.web3.VersionedTransaction(messageV0);
    transaction.sign([payer]);

    return await connection.sendTransaction(transaction, { maxRetries: 5 });
  }

  //TODO add your own payer wallet here (make sure it has devnet funds)
  const payer = anchor.web3.Keypair.fromSecretKey(
    // bs58.decode(PRIVATE_KEY)
    // Uint8Array.from([PRIVATE_KEY]);
  );

  // Create a new account to initialize it later
  const newAccount = anchor.web3.Keypair.generate();
  console.log("New account: ", newAccount.publicKey.toString());

  let altAddress: anchor.web3.PublicKey | undefined;

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize("Hello")
      .accounts({
        // The Keypair we generated above
        newAccount: newAccount.publicKey,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer, newAccount])
      .rpc();
    console.log("Transaction signature", tx);
  });

  it("Create ALT", async () => {
    const currentSlot = await connection.getSlot();
    // To make sure our slot is not too old
    const slots = await connection.getBlocks(currentSlot - 200, undefined, "confirmed");

    // Create the ALT instruction
    const [lookupTableInst, lookupTableAddress] =
      anchor.web3.AddressLookupTableProgram.createLookupTable({
        authority: payer.publicKey,
        payer: payer.publicKey,
        recentSlot: slots[0],
      });

    altAddress = lookupTableAddress;
    console.log("ALT address:", lookupTableAddress.toBase58());

    // Create the extend instruction to add our new account to the ALT
    const extendInstruction = anchor.web3.AddressLookupTableProgram.extendLookupTable({
      payer: payer.publicKey,
      authority: payer.publicKey,
      lookupTable: lookupTableAddress,
      addresses: [
        payer.publicKey,
        anchor.web3.SystemProgram.programId,
        // The account we initialized in the previous test
        newAccount.publicKey,
      ],
    });

    // Send the transaction using the helper function
    const txid = await createAndSendV0Tx([lookupTableInst, extendInstruction]);

    console.log("Transaction signature: ", txid);
  })

  it("Update our new account in the ALT", async () => {
    // Wait a little so that the ALT won't return null as its value;
    await new Promise((resolve) => setTimeout(resolve, 10000));
    // Fetch the ALT
    const lookupTableAccount = (await connection.getAddressLookupTable(new anchor.web3.PublicKey(altAddress.toBase58()))).value;
    console.log("ALT address: ", lookupTableAccount)

    // Get the address of our new account we initialized in the first test
    // [0] is the authority, [1] is the system program, [2] is our new account
    // Here could be your logic to find the fitting account for the deposit
    const accountAddress = lookupTableAccount.state.addresses[2]

    // Fetch the data of our account before the update
    const dataBefore = (await program.account.myAccount.fetch(accountAddress)).data;
    console.log("data before: ", dataBefore);

    // Update the account
    const tx = await program.methods
      .update("Bye")
      .accounts({
        myAccount: accountAddress,
        signer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    // Fetch the data of our account after the update
    const dataAfter = (await program.account.myAccount.fetch(accountAddress)).data;
    console.log("data after", dataAfter);
  });
});
