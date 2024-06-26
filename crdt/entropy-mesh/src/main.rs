use std::collections::BTreeSet;
use crdts::{
    CmRDT,
    merkle_reg::{Hash, MerkleReg, Sha3Hash}
};
use tiny_keccak::{Hasher, Sha3};
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
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};

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

use serde::{Serialize, Deserialize};

use rand_chacha::{
    rand_core::SeedableRng,
    ChaCha20Rng
};

/// a simulation randomness beacon
struct BeaconSim<E: EngineBLS> {
    pub public_key: DoublePublicKey<E>, 
    pub latest_index: u32,
    pub prev_hash: Hash,
    msk: SecretKeyVT<E>, 
}

#[derive(CanonicalSerialize, CanonicalDeserialize, Debug)]
struct Pulse<E: EngineBLS>  {
    /// the hash of the previous pulse
    pub prev_hash: Hash,
    /// the sig associated with the pulse
    pub sig: E::SignatureGroup,
    /// the DLEQ proof
    pub dleq: SchnorrProof<E>,
}

impl<E: EngineBLS> Sha3Hash for Pulse<E> {
    // this is an unsafe function, but just go with it
    fn hash(&self, hasher: &mut Sha3) {
        let mut bytes = vec![];
        let mut output = [0; 32];
        self.serialize_compressed(&mut bytes).unwrap();
        hasher.update(&bytes);
        // hasher.finalize(&mut output);
        // sha256(&out)[..].try_into().unwrap() 
    }
}

impl<E: EngineBLS> BeaconSim<E> {

    /// create a new beacon
    fn new(seed: &[u8]) -> Self {
        let seed_hash: [u8;32] = sha256(seed).try_into().unwrap();
        let mut rng: ChaCha20Rng = ChaCha20Rng::from_seed(seed_hash);
        let keypair = w3f_bls::KeypairVT::<E>::generate(&mut rng);
        let msk = keypair.clone().secret;
        let double_public = keypair.into_double_public_key();

        BeaconSim {
            prev_hash: [0;32],
            msk,
            public_key: double_public,
            latest_index: 0
        }
    }

    /// output the next pulse in the beacon
    /// creates a hash-chain of pulses where each 'next' pulse
    /// is linked to the previous pulse with a crypto hash function 
    fn next_pulse(&mut self, message: &Message) -> Pulse<E> {
        let chaum_pedersen_signature =
            ChaumPedersenSigner::<E, Sha256>::generate_cp_signature(
                &mut self.msk, 
                message
            );

        let next_pulse = Pulse {
            prev_hash: self.prev_hash,
            sig: chaum_pedersen_signature.0.0, 
            dleq: chaum_pedersen_signature.1
        };

        // convert pulse to hash
        // let hash = next_pulse.hash();
        // self.prev_hash = hash;
        self.latest_index += 1;

        next_pulse 
    }
}

fn main() {
    // init the merkle reg
    // let mut init_vclock = VClock::new();
    let mut merkle_reg = MerkleReg::<Pulse<TinyBLS377>>::new();
    let empty_children = BTreeSet::<Hash>::new();

    // init some beacons
    let mut beacon0 = BeaconSim::<TinyBLS377>::new(b"test0");
    let mut beacon1 = BeaconSim::<TinyBLS377>::new(b"test1");
    // 'register' the beacon (for verification later on)
    // TODO

    let msg: &[u8] = b"this is a test".as_slice();
    
    let id0: Message = Message::from(b"00".as_slice());
    let id1: Message = Message::from(b"10".as_slice()); 

    // 1. lock message for "chainId/beacon0/pulse/0"
    // let mut rng: ChaCha20Rng = ChaCha20Rng::from_seed([1;32]);
    // let ephemeral_sk: SecretKey<TinyBLS377> = SecretKey(
    //     <TinyBLS377 as EngineBLS>::Scalar::rand(&mut rng)
    // );
    // let ct = ephemeral_sk.encrypt(
    //     beacon0.public_key.1,
    //     msg,
    //     Identity(id0.clone()),
    //     &mut rng,
    // ).unwrap();

    // generate pulses and write to the merkle registry
    // we assume both pulse are written on top of empty children 
    let p00 = beacon0.next_pulse(&id0);
    let p00_node = merkle_reg.write(p00, empty_children.clone());
    merkle_reg.apply(p00_node);

    let p10 = beacon1.next_pulse(&id1);
    let p10_node = merkle_reg.write(p10, empty_children);
    merkle_reg.apply(p10_node);

    // then there should be two nodes?
    let num = merkle_reg.num_nodes();
    println!("there are {:?} nodes in the registry", num);
    // 2. unlock message using beacon output
    // let plaintext = ct.decrypt(vec![IBESecret(p00.sig)]).unwrap();
    // println!("plaintext decryts? {:?}", msg.eq(&plaintext.message));

}

