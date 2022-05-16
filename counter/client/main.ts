// import {
// 	Connection,
// 	Keypair,
// 	PublicKey,
// 	SystemProgram,
// 	TransactionInstruction,
// 	sendAndConfirmTransaction,
// 	Transaction,
// } from "@solana/web3.js";
// import path from "path";
// import * as borsh from "borsh";

// import {
// 	getPayer,
// 	establishConnection,
// 	checkAccountDeployed,
// 	checkBinaryExists,
// 	getBalance,
// 	establishEnoughSol,
// 	getUserInput,
// } from "../utils/utils";
// import { writeFile, existsSync, readFileSync } from "fs";
// import { Key } from "mz/readline";


// const ACCOUNT_KEYPAIR_PATH = path.join(__dirname, "../account.json");
// const programId = new PublicKey("9AoPaBe7fF28ew33bWQjvqcPZ1zVDbrrrztRURZn3KKL");


// class GreetingAccount {
// 	counter = 0;
// 	constructor(fields: { counter: number } | undefined = undefined) {
// 		if (fields) {
// 			this.counter = fields.counter;
// 		}
// 	}
// }

// (async () => {
// 	const connection: Connection = await establishConnection();

// 	const isProgramDeployed = await connection.getAccountInfo(programId);
// 	if (!isProgramDeployed) {
// 		console.error("you should deploye the program");
// 	}


// 	console.log(Buffer.alloc(5))

// })();

// async function createPDA(connection: Connection, payer: Keypair, programId: PublicKey) {

// 	let seed = await getUserInput();
// 	let seedBuf = Buffer.from(seed);
// 	PublicKey.createWithSeed()

// 	let [programAddress, bump] = await PublicKey.findProgramAddress([seedBuf], programId);

// 	// let instructionSet = Buffer.concat(
// 	// 	// Buffer.alloc(1, 0),
// 	// )

// 	// console.log(instructionSet)



// }





































import {
	Connection,
	Keypair,
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	sendAndConfirmTransaction,
	Transaction,
} from "@solana/web3.js";
import path from "path";
import * as borsh from "borsh";

import {
	getPayer,
	establishConnection,
	checkAccountDeployed,
	checkBinaryExists,
	getBalance,
	establishEnoughSol,
} from "../utils/utils";
import { writeFile, existsSync, readFileSync } from "fs";
import { Key } from "mz/readline";


const ACCOUNT_KEYPAIR_PATH = path.join(__dirname, "../account.json");
const programId = new PublicKey("9AoPaBe7fF28ew33bWQjvqcPZ1zVDbrrrztRURZn3KKL");


class GreetingAccount {
	counter = 0;
	constructor(fields: { counter: number } | undefined = undefined) {
		if (fields) {
			this.counter = fields.counter;
		}
	}
}

(async () => {
	const connection: Connection = await establishConnection();

	const isProgramDeployed = await connection.getAccountInfo(programId);
	if (!isProgramDeployed) {
		console.error("you should deploye the program");
	}

	let payer: Keypair = await getPayer();
	let greetedkeypair = Keypair.generate();

	if (existsSync(ACCOUNT_KEYPAIR_PATH)) {
		const key = readFileSync(ACCOUNT_KEYPAIR_PATH);
		console.log(key)
		greetedkeypair = Keypair.fromSecretKey(key);
	} else {
		console.log("New account, creating....");
		writeAccountKeypair(greetedkeypair);
		createAccountIfNotExists(connection, greetedkeypair, payer, programId);
	}

	console.log("\nusing the following account keypair");
	console.log(greetedkeypair.publicKey.toString());
	console.log()

	const accountInfoCreated = await connection.getAccountInfo(greetedkeypair.publicKey);
	console.log("account info that just created: ", accountInfoCreated);
	console.log("account info: ", accountInfoCreated?.data);

	const GreetingSchema = new Map([
		[GreetingAccount, { kind: "struct", fields: [["counter", "u32"]] }],
	]);

	let buf: Buffer;
	if (accountInfoCreated?.data != undefined) {
		buf = accountInfoCreated.data
		const newValue = borsh.deserialize(GreetingSchema, GreetingAccount, buf);
		console.log();
		console.log("new value: ", newValue);
	}

	console.log();
	console.log("saying hello ...");
	console.log();
	await sayHello(connection, greetedkeypair, programId, payer);
})();

async function createAccountIfNotExists(connection: Connection, greetedkeypair: Keypair, payer: Keypair, programId: PublicKey) {
	const GreetingSchema = new Map([
		[GreetingAccount, { kind: "struct", fields: [["counter", "u32"]] }],
	]);

	const GREETING_SIZE = borsh.serialize(
		GreetingSchema,
		new GreetingAccount()
	).length;

	const lamports = await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);

	const txInstruction = SystemProgram.createAccount({
		fromPubkey: payer.publicKey,
		newAccountPubkey: greetedkeypair.publicKey,
		lamports: lamports,
		space: GREETING_SIZE,
		programId: programId,
	})

	console.log();
	console.log("the following account will pay");
	console.log("payer: ", payer.publicKey.toBase58());
	console.log();

	const transaction = new Transaction().add(txInstruction);
	await sendAndConfirmTransaction(connection, transaction, [payer, greetedkeypair]);
	return;
}

async function sayHello(connection: Connection, greetedkeypair: Keypair, programId: PublicKey, payer: Keypair) {
	console.log('Saying hello to', greetedkeypair.publicKey.toBase58());
	console.log('Program id :', programId.toBase58());

	const instruction = new TransactionInstruction({
		keys: [{ pubkey: greetedkeypair.publicKey, isSigner: false, isWritable: true }],
		programId,
		data: Buffer.alloc(0), // All instructions are hellos
	});
	await sendAndConfirmTransaction(
		connection,
		new Transaction().add(instruction),
		[payer]
	);
}

function writeAccountKeypair(keypair: Keypair) {
	const buf = Uint8Array.from(keypair.secretKey);
	writeFile(ACCOUNT_KEYPAIR_PATH, buf, (err) => {
		if (err) {
			console.log("error writing account keypair", err);
		}
	});
}