# Solana program that implemets counter

## How to run

### Counter

```bash
cd counter
cargo build-bpf
```

run validator, and logs in separate terminal
```bash
solana-test-validator
solana logs
```

then deploy the program
```bash
solana deploy target/deploy/counter.so
```

Copy programId from the output of the previous command
paste it into client/main.ts

```typescript
const programId = new PublicKey("9AoPaBe7fF28ew33bWQjvqcPZ1zVDbrrrztRURZn3KKL");
```

then run the client
```bash
make client
```


