import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';

import { put, get, del } from '@web3-storage/pail'
import { ShardBlock } from '@web3-storage/pail/shard'
import { MemoryBlockstore } from '@web3-storage/pail/block'

import init, { generate_keys, extract_signature } from '@ideallabs/etf-sdk';

class Pulse {
  constructor(signature, id, index) {
    this.signature = signature;
    this.id = id;
    this.index = index;
  }
}

class BeaconSim {
  constructor(chainId, keypair, genesis) {
    this.chainId = chainId;
    this.keypair = keypair;
    this.prevPulseIndex = genesis;
  }

  nextPulse() {
    let nextPulseIndex = this.prevPulseIndex + 1;
    console.log('next Pulse index ' + nextPulseIndex)
    let t = new TextEncoder();
    let pulseId = t.encode('0x' + this.chainId + nextPulseIndex);
    let pulseRandomness = extract_signature(pulseId, this.keypair.sk);
    let pulse = new Pulse(pulseRandomness, pulseId, nextPulseIndex);
    this.prevPulseIndex = nextPulseIndex;
    return pulse;
  }
}

function App() {

  const [beacons, setBeacons] = useState([]);
  const [memoryBlockstore, setMemoryBlockstore] = useState(null);
  const [rootShard, setRootShard] = useState(null);

  const [searchChainId, setSearchChainId] = useState('');
  const [searchPulseIndex, setSearchPulseIndex] = useState(0);


  const [run, setRun] = useState(false);

  const INTERVAL = 3000;

  const randomNumberInRange = (min, max) => {
    return Math.floor(Math.random()
        * (max - min + 1)) + min;
  };

  // const toHexString = (byteArray) => {
  //   return Array.from(byteArray, function(byte) {
  //     return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  //   }).join('')
  // }


  useEffect(() => {

    console.log("component rendered or updated");

    const setup = async () => {
      // Initialize a new bucket
      const blocks = new MemoryBlockstore();
      const init = await ShardBlock.create(); // empty root shard
      await blocks.put(init.cid, init.bytes);

      // console.log('initial blocks ' + JSON.stringify(blocks));
      // console.log('initial cid ' + init.cid);

      let newBeacons = [];
      let beacon1 = buildBeacon("DOT");
      let beacon2 = buildBeacon("ETH");
      newBeacons.push(beacon1);
      newBeacons.push(beacon2);

      setBeacons(newBeacons);
      setMemoryBlockstore(blocks);
      setRootShard(init.cid);

      // const interval = setInterval(async () => {
      //   let b = randomNumberInRange(0, 2);
      //   if (beacons) {
      //     let beacon = beacons[b];
      //     if (beacon) {
      //       let pulse = beacon.nextPulse();
      //       let uri = '/beacon/2.0/chain/' + beacon.chainId + '/pulse/' + pulse.index;
      //       console.log(JSON.stringify(beacon))
      //       // Add a key and value to the bucket
      //       const { root, additions, removals } 
      //         = await put(blocks, init.cid, uri, pulse)
      //       console.log(`new root: ${root}`)
      //       // console.log(
      //       //   'latest pulse: chainId ' 
      //       //   + beacon.chainId 
      //       //   + ', randomness: ' 
      //       //   + JSON.stringify(pulse)
      //       // );
      //     }
      //   }
      // }, INTERVAL);
  
      // return () => clearInterval(interval);
    }

    init().then(_ => {
      setup()
    });

  }, [])

  const runBeacons = () => {
    const interval = setInterval(async () => {
      let b = randomNumberInRange(0, 2);
      if (beacons) {
        let beacon = beacons[b];
        if (beacon) {
          let pulse = beacon.nextPulse();
          let uri = '/beacon/2.0/chain/' + beacon.chainId + '/pulse/' + pulse.index;
          
          // Logging the initial blockstore state
          console.log('Initial blockstore: ', memoryBlockstore);
  
          // Use the functional update form to ensure the latest state is used
          setMemoryBlockstore(prevBlockstore => {
            // Clone the current blockstore to perform operations on it
            // let blockstore = { ...prevBlockstore };
            let blockstore = memoryBlockstore;
  
            const updateBlockstore = async () => {
              const { root, additions, removals } = await put(blockstore, rootShard, uri, pulse);
              console.log('additions: ', additions);
              console.log(`new root: ${root}`);
  
              // Process the additions
              for (const block of additions) {
                await blockstore.put(block.cid, block.bytes);
              }
  
              // Uncomment this if you need to handle removals
              // Process the removals
              // for (const block of removals) {
              //   await blockstore.delete(block.cid);
              // }
  
              // console.log('want ' + JSON.stringify(blockstore));
              // // Return the updated blockstore
              // let out = {
              //   blockstore,
              //   root,
              // }
              return blockstore;
            };
  
            // // Perform the blockstore update asynchronously
            updateBlockstore().then(() => {
              console.log('current root shard cid ' + rootShard)
            });
            // .then((out) => {
            //   console.log(`setting root ${JSON.stringify(out)}`)
              // Logging the updated blockstore state
              // console.log('Updated blockstore: ', updatedBlockstore);
              // setRootShard(root);
              // setMemoryBlockstore(updatedBlockstore);
            // });
  
            // Return the current blockstore as is for now
            return blockstore;
          });
        }
      }
    }, INTERVAL);
  
    // Clear the interval when the component is unmounted
    return () => clearInterval(interval);
  };
  
  

  // const runBeacons = () => {
  //   const interval = setInterval(async () => {
  //     let b = randomNumberInRange(0, 2);
  //     if (beacons) {
  //       let beacon = beacons[b];
  //       if (beacon) {
  //         let pulse = beacon.nextPulse();
  //         let uri = '/beacon/2.0/chain/' + beacon.chainId + '/pulse/' + pulse.index;
  //         // console.log(JSON.stringify(beacon));
  //         let blockstore = memoryBlockstore;
  //         console.log('blockstore: ' + JSON.stringify(blockstore))
  //         // Add a key and value to the bucket
  //         const { root, additions, removals } = await put(blockstore, rootShard, uri, pulse);
  //         setRootShard(root);
  //         console.log('additions ' +additions)
  //         console.log(`new root: ${root}`);
          
  //         // Process the diff
  //         for (const block of additions) {
  //           await blockstore.put(block.cid, block.bytes);
  //         }

  //         // for (const block of removals) {
  //         //   await blockstore.delete(block.cid);
  //         // }

  //         setMemoryBlockstore(blockstore);
  //       }
  //     }
  //   }, INTERVAL);
  //   return () => clearInterval(interval);
  // }

  const queryMesh = async () => {
    let uri = '/beacon/2.0/chain/' + searchChainId + '/pulse/' + searchPulseIndex;
    console.log('searching for key ' + uri);
    console.log('blockstore ' + JSON.stringify(memoryBlockstore));
    console.log('root ' + rootShard)
    const {out} = await get(memoryBlockstore, rootShard, uri);
    console.log(out);
  }


  function buildBeacon(seed) {
    let t = new TextEncoder();
    let keypair = generate_keys(t.encode(seed));
    let beacon = new BeaconSim(seed, keypair, 0);
    return beacon;
    // setBeacons(beacons => [...beacons, beacon]);
  }

  return (
    <div className="App">
      <div className='title'>
        Entropy Mesh Simulator
      </div>
      <div className="body">
          {/* <button onClick={runBeacon}>Start</button> */}
          <div className='beacon-search'>
            <label htmlFor='chainId'>Chain Id</label>
            <input type='text' name='chainId' value={searchChainId} onChange={(e) => setSearchChainId(e.target.value)} />
            <label htmlFor='pulseIndex'>Pulse Index</label>
            <input type='number' name='pulseIndex' value={searchPulseIndex} onChange={(e) => setSearchPulseIndex(e.target.value)} />
            <span>uri: /beacon/2.0/chain/{searchChainId ? searchChainId : '_'}/pulse/{searchPulseIndex}</span>
            <button onClick={queryMesh}>Search</button>
          </div>
          <div className='beacons-container'>
            { beacons.map(b => {
              return <div key={b.chainId} className='beacon-container'>
                <span>Chain Id: { b.chainId }</span>
                <span>Latest Pulse Index: { b.prevPulseIndex }</span>
              </div>
            }) }
          </div>
          <div>
            { run === true ? 
              <button>stop</button>
            : <button onClick={runBeacons}>start</button>
            }
          </div>
      </div>
    </div>
  );
}

export default App;
