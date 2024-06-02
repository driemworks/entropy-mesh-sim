import React, { useContext, useState, useRef } from 'react';
import { get } from '@web3-storage/pail';
import {toHexString} from '../util';
import { EntropyMeshContext } from '../mesh.context';

const MeshQueryContainer = () => {
    const { beacons, memoryBlockstore, rootShard } = useContext(EntropyMeshContext);
    const [searchChainId, setSearchChainId] = useState('DOT');
    const [searchPulseIndex, setSearchPulseIndex] = useState(1);
    const [queryResult, setQueryResult] = useState('');
    const searchChainIdRef = useRef(null);
    const searchPulseIndexRef = useRef(null);

    const handleSearchChainIdChange = (event) => {
        setSearchChainId(event.target.value);
    };

    const handleSearchPulseIndexChange = (event) => {
        setSearchPulseIndex(event.target.value);
    };

    const handleSearch = async () => {
        const chainId = searchChainIdRef.current.value;
        const pulseIndex = searchPulseIndexRef.current.value;
        const uri = buildUri(chainId, pulseIndex);
        try {
            const out = await get(memoryBlockstore, rootShard, uri);
            if (out) {
                setQueryResult(`0x${toHexString(out.signature)}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const buildUri = (chainId, pulseIndex) => {
        return `/beacon/2.0/chain/${chainId}/pulse/${pulseIndex}`;
    };

    return (
        <div className='beacon-search'>
            <div className='search-box'>
                <label htmlFor='chainId'>Chain Id</label>
                <input
                    type='text'
                    name='chainId'
                    ref={searchChainIdRef}
                    value={searchChainId}
                    onChange={handleSearchChainIdChange}
                />
                <label htmlFor='pulseIndex'>Pulse Index</label>
                <input
                    type='number'
                    name='pulseIndex'
                    ref={searchPulseIndexRef}
                    value={searchPulseIndex}
                    onChange={handleSearchPulseIndexChange}
                />
                <span className='uri-display'>uri: {buildUri(searchChainId, searchPulseIndex)}</span>
                <button onClick={handleSearch}>Search</button>
            </div>
            <div className='results'>Result: {queryResult ? queryResult.substring(0, 8) + '...' + queryResult.substring(queryResult.length - 30) : 'no results'}</div>
        </div>
    );
};

export default MeshQueryContainer;
