import React from 'react';
import { useContext, useEffect, useState, useRef } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import EventEmitter from 'events';
import { put, get, del } from '@web3-storage/pail';
import { ShardBlock } from '@web3-storage/pail/shard';
import { MemoryBlockstore } from '@web3-storage/pail/block';
import { EntropyMeshContext } from './mesh.context';
import init, { generate_keys, extract_signature } from '@ideallabs/etf-sdk';
import MeshQueryContainer from './components/mesh-query.container';
import TLock from './components/tlock';
// import BeaconContainer from './components/beacon-container';
import { buildUri } from './util';
import './App.css';

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

  const beaconListener = useRef(new EventEmitter()).current;

  const INTERVAL = 5000;

  const randomNumberInRange = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  useEffect(() => {
    const setup = async () => {
      const blocks = new MemoryBlockstore();
      const initShard = await ShardBlock.create(); // empty root shard
      await blocks.put(initShard.cid, initShard.bytes);

      let newBeacons = [];
      let beacon1 = buildBeacon('DOT');
      let beacon2 = buildBeacon('ETH');

      newBeacons.push(beacon1);
      newBeacons.push(beacon2);

      return { newBeacons, blocks, shard: initShard.cid };
    };

    const setupAndRun = async () => {
      await init();
      const { newBeacons, blocks, shard } = await setup();
      setBeacons(newBeacons);
      setMemoryBlockstore(blocks);
      setRootShard(shard);

      const intervalId = setInterval(() => randBeacon(newBeacons), INTERVAL);
      return () => clearInterval(intervalId);
    };

    setupAndRun();
  }, []);

  useEffect(() => {
    const handlePulse = async ({ uri, pulse }) => {
      if (!memoryBlockstore || !rootShard) return;
      try {
        const { root, blockstore } = await updateBlockstore(memoryBlockstore, rootShard, uri, pulse);

        setRootShard(root);
        setMemoryBlockstore(blockstore);
      } catch (e) {
        console.error(e);
      }
    };

    // const handleQuery = async (uri) => {
    //   if (!memoryBlockstore || !rootShard) return;
    //   console.log('Querying mesh with memory blockstore:', memoryBlockstore);
    //   console.log('Querying mesh with root:', rootShard.toString());
    //   const out = await get(memoryBlockstore, rootShard, uri);
    //   // setQueryResult(`0x${toHexString(out.signature)}`);
    // };

    beaconListener.on('pulse', handlePulse);
    // beaconListener.on('query', handleQuery);

    return () => {
      // beaconListener.off('query', handleQuery);
      beaconListener.off('pulse', handlePulse);
    };
  }, [memoryBlockstore, rootShard]);

  // randomly choose a beacon and emit a pulse
  const randBeacon = (newBeacons) => {
    let b = randomNumberInRange(0, newBeacons.length - 1);
    let beacon = newBeacons[b];
    let pulse = beacon.nextPulse();
    let uri = buildUri(beacon.chainId, pulse.index);
    beaconListener.emit('pulse', { uri, pulse });
  };

  const updateBlockstore = async (blockstore, rootShardCID, uri, pulse) => {
    try {
      const { root, additions, removals } = await put(blockstore, rootShardCID, uri, pulse);
      for (const block of additions) {
        await blockstore.put(block.cid, block.bytes);
      }
      for (const block of removals) {
        await blockstore.delete(block.cid);
      }
      const out = await get(blockstore, root, uri);
      // console.log('recovered ' + JSON.stringify(out));
      return { root, blockstore };
    } catch (error) {
      console.error(error);
    }
  };

  // const queryMesh = () => {
  //   let uri = buildUri(searchChainId, searchPulseIndex);
  //   beaconListener.emit('query', uri);
  // };

    const BeaconContainer = () => {
    const { beacons, blocks, root } = useContext(EntropyMeshContext);
    return (
      <div className="beacon-container">
        <h2 className="beacons-title">Beacons</h2>
        <div className="beacon-grid">
          {beacons.map((b) => (
            <div key={b.chainId} className="beacon-item">
              <span>Chain Id: {b.chainId}</span>
              <span>Latest Pulse Index: {b.prevPulseIndex}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  function buildBeacon(seed) {
    let t = new TextEncoder();
    let keypair = generate_keys(t.encode(seed));
    let beacon = new BeaconSim(seed, keypair, 0);
    return beacon;
  }

  return (
    <div className="App">
      <div className='title'>
        Entropy Mesh Simulator
      </div>
      <div className="body">
        <div>
          <span>Latest root: {JSON.stringify(rootShard)}</span>
        </div>
        <div className='beacons-container'>
          <EntropyMeshContext.Provider value={{ beacons, memoryBlockstore, rootShard }}>
            <Tabs>
              <TabList>
                <Tab>Lock</Tab>
                <Tab>Query</Tab>
                <Tab>Beacons</Tab>
              </TabList>

              <TabPanel>
                <TLock />
              </TabPanel>
              <TabPanel>
                <MeshQueryContainer />
              </TabPanel>
              <TabPanel>
                <BeaconContainer />
              </TabPanel>
            </Tabs>
          </EntropyMeshContext.Provider>
        </div>
      </div>
    </div>
  );
}

export default App;
