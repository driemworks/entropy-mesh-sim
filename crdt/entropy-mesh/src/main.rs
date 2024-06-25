use etf_crypto_primitives::{
    self, 
    encryption::tlock::{
        DecryptionResult, 
        SecretKey, 
        TLECiphertext
    }, 
    ibe::fullident::{
        IBESecret, 
        Identity
    }, utils::{sha256}
};
use sha2::Sha256;
use ark_std::UniformRand;

use w3f_bls::{
    chaum_pedersen_signature::{
        ChaumPedersenSignature, 
        ChaumPedersenSigner
        },
    DoublePublicKey, 
    DoublePublicKeyScheme,
    DoubleSignature,
    EngineBLS, 
    TinyBLS377,
    SecretKeyVT,
    SchnorrProof,
    Message,
};

use rand_chacha::{
    rand_core::SeedableRng,
    ChaCha20Rng
};

// a 
struct BeaconSim<E: EngineBLS> {
    pub public_key: DoublePublicKey<E>, 
    pub latest_index: u32,
    msk: SecretKeyVT<E>, 
}

impl<E: EngineBLS> BeaconSim<E> {
    fn new(seed: &[u8]) -> Self {
        let seed_hash: [u8;32] = sha256(seed).try_into().unwrap();
        let mut rng: ChaCha20Rng = ChaCha20Rng::from_seed(seed_hash);
        let keypair = w3f_bls::KeypairVT::<E>::generate(&mut rng);
        let msk = keypair.clone().secret;
        let double_public = keypair.into_double_public_key();

        BeaconSim {
            msk,
            public_key: double_public,
            latest_index: 0
        }
    }

    fn next_pulse(&mut self, message: &Message) -> (E::SignatureGroup, SchnorrProof<E>) {
        let chaum_pedersen_signature =
            ChaumPedersenSigner::<E, Sha256>::generate_cp_signature(
                &mut self.msk, 
                message
            );
        (chaum_pedersen_signature.0.0, chaum_pedersen_signature.1)
    }
}

fn main() {
    // construct a beacon
    let mut beacon0 = BeaconSim::<TinyBLS377>::new(b"test0");
    // let mut beacon1 = BeaconSim::<TinyBLS377>::new(b"test1");
    // 'register' the beacon (for verification later on)
    // TODO

    let msg: &[u8] = b"this is a test".as_slice();
    let id0: Message = Message::from(b"0".as_slice());
    // 1. lock message for "chainId/beacon0/pulse/0"
    let mut rng: ChaCha20Rng = ChaCha20Rng::from_seed([1;32]);
    let ephemeral_sk: SecretKey<TinyBLS377> = SecretKey(
        <TinyBLS377 as EngineBLS>::Scalar::rand(&mut rng)
    );
    let ct = ephemeral_sk.encrypt(
        beacon0.public_key.1,
        msg,
        Identity(id0.clone()),
        &mut rng,
    ).unwrap();

    // generate pulses and write to the vector clock 
    let p00 = beacon0.next_pulse(&id0);
    // 2. unlock message using beacon output
    let plaintext = ct.decrypt(vec![IBESecret(p00.0)]).unwrap();
    println!("plaintext decryts? {:?}", msg.eq(&plaintext.message));
    // let p00 = beacon1.next_pulse(&Message::from(b"0".to_vec().as_slice()));

}

