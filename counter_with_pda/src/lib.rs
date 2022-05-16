use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    // program_error::CustomError,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
};
use std::ops::Deref;
use std::str::from_utf8;

/// Defines the structure of the state stored in the on-chain account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, BorshSchema)]
pub struct WordStruct {
    pub word: String,
}

entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the counter program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored
) -> ProgramResult {
    msg!("Hello World Rust program entrypoint");

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to say hello to

    let split = _instruction_data.split_first();
    let (function_flag, rest) = split.ok_or(ProgramError::BorshIoError(
        "Invalid parameters passed".to_string(),
    ))?;

    if 0 == *function_flag {
        let funder = next_account_info(accounts_iter)?;
        let account_to_init = next_account_info(accounts_iter)?;
        if **account_to_init.try_borrow_lamports()? > 0 {
            msg!("This account is already initialised that account, skipping");
            return Ok(());
        }

        msg!("[instruction] function_flag is:{:?} ", function_flag);

        let (key_length, rest) = rest.split_first().ok_or(ProgramError::BorshIoError(
            "Invalid parameters passed".to_string(),
        ))?;

        let seed = from_utf8(rest.get(..*key_length as usize).unwrap())
            .unwrap()
            .to_string();

        msg!("[instruction] seed is:{:?} ", seed);

        let bump = *rest.get(*key_length as usize).unwrap();

        msg!("[instruction] extracted bump: {:?}", bump);

        // Get account size in bytes
        let account_size = *rest.last().unwrap();

        msg!("[instruction] extracted account size: {:?}", account_size);
        let lamports = Rent::default().minimum_balance(account_size as usize);

        // let word = WordStruct {
        //     word: String::from("default"),
        // };

        let ix = solana_program::system_instruction::create_account(
            funder.key,
            account_to_init.key,
            lamports,
            account_size as u64,
            program_id,
        );

        msg!("[functions] PDA instruction created");

        // Sign and submit transaction
        invoke_signed(
            &ix,
            &[funder.clone(), account_to_init.clone()],
            &[&[seed.as_bytes(), &[bump]]],
        )?;

        return Ok(());
    }

    if 1 == *function_flag {
        msg!("[instruction] function_flag is:{:?} ", function_flag);

        let (key_length, rest) = rest.split_first().ok_or(ProgramError::BorshIoError(
            "Invalid parameters passed".to_string(),
        ))?;

        let word = from_utf8(rest.get(..*key_length as usize).unwrap())
            .unwrap()
            .to_string();

        msg!("[instruction] word is:{:?} ", word);

        let pda_account = next_account_info(accounts_iter)?;

        if pda_account.owner != program_id {
            msg!("Word account does not have the correct program id");
            return Err(ProgramError::IncorrectProgramId);
        } else {
            msg!("Word account has the correct program id");
        }

        let lamports = pda_account.try_borrow_lamports()?;
        msg!("Amount of lamports in pda_account \"{:?}\"", lamports);

        // create struct from data under account using the template
        let mut word_account = try_from_slice_unchecked::<WordStruct>(&pda_account.data.borrow())?;

        msg!(
            "Will attempt to serialise \"{:?}\" to account {:?}",
            word,
            pda_account.key
        );

        word_account.word = word;

        // serialise and slap it back into the account
        word_account.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

        msg!("Serialisation to PDA successful");
    }

    if 2 == *function_flag {
        msg!("[instruction] function_flag is:{:?} ", function_flag);

        let (key_length, rest) = rest.split_first().ok_or(ProgramError::BorshIoError(
            "Invalid parameters passed".to_string(),
        ))?;

        let word = from_utf8(rest.get(..*key_length as usize).unwrap())
            .unwrap()
            .to_string();

        msg!("[instruction] word is:{:?} ", word);

        let pda_account = next_account_info(accounts_iter)?;
        let user_account = next_account_info(accounts_iter)?;

        transfer_service_fee_lamports(pda_account, user_account)?;

        let lamports1 = pda_account.try_borrow_lamports()?;
        msg!("Amount of lamports left in pda_account \"{:?}\"", lamports1);
    }

    Ok(())
}

// TODO: transfer lamports from pda to a user's PubKey
fn transfer_service_fee_lamports(
    from_account: &AccountInfo,
    to_account: &AccountInfo,
) -> ProgramResult {
    // Does the from account have enough lamports to transfer?
    // if **from_account.try_borrow_lamports()? < amount_of_lamports {
    //     // return Err(CustomError::InsufficientFundsForTransaction.into());
    //     return Err(ProgramError::Custom(1));
    // }
    // Debit from_account and credit to_account
    **from_account.try_borrow_mut_lamports()? -=
        solana_program::native_token::LAMPORTS_PER_SOL * 80;
    **to_account.try_borrow_mut_lamports()? += solana_program::native_token::LAMPORTS_PER_SOL * 80;

    Ok(())
}
