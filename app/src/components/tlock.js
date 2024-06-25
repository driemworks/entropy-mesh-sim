import React, { useContext, useState } from 'react';
import { EntropyMeshContext } from '../mesh.context';
import init, {encrypt, decrypt, generate_keys, extract_signature, build_encoded_commitment} from "@ideallabs/etf-sdk";
import hkdf from 'js-crypto-hkdf'; // for npm
import './tlock.css'
import { buildUri } from '../util';

const TLock = () => {
  const { beacons } = useContext(EntropyMeshContext);
  const [futureBlocks, setFutureBlocks] = useState({});
  const [isValid, setIsValid] = useState(true);

  const handleChange = (event, chainId, prevPulseIndex) => {
    const { value } = event.target;
    const intValue = parseInt(value, 10);

    if (intValue > prevPulseIndex) {
      setFutureBlocks({ ...futureBlocks, [chainId]: intValue });
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic here
    console.log('Future block numbers:', futureBlocks);
  };

  const handleTlock = () => {
    let dotUri = buildUri("DOT", futureBlocks["DOT"]);
    let ethUri = buildUri("ETH", futureBlocks["ETH"]);

    const masterSecret = new TextEncoder().encode("my_password"); // Uint8Array of arbitrary length
    const hash = 'SHA-256';
    const length = 32; // derived key length
    const info = ''; // information specified in rfc5869
    hkdf.compute(masterSecret, hash, length, info).then((derivedKey) => {
        // now you get a automatically-generated salt and a key derived from the masterSecret.
        // encrypt()
        // console.log(JSON.stringify(derivedKey))

    });
  }

  return (
    <div className="tlock-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="textInput">Text Input:</label>
          <textarea
            id="textInput"
            className="text-input"
            rows="4"
            cols="50"
            placeholder="Enter your text here..."
          />
        </div>

        {beacons.map((beacon) => (
          <div key={beacon.chainId} className="beacon-input-group">
            <label htmlFor={`futureBlock-${beacon.chainId}`}>
              Future Block Number for {beacon.chainId} (greater than {beacon.prevPulseIndex}):
            </label>
            <input
              type="number"
              id={`futureBlock-${beacon.chainId}`}
              className="number-input"
              min={beacon.prevPulseIndex + 1}
              onChange={(e) => handleChange(e, beacon.chainId, beacon.prevPulseIndex)}
            />
          </div>
        ))}

        <button type="submit" disabled={!isValid} className="submit-button" onClick={handleTlock}>
          Submit
        </button>
      </form>

      {!isValid && <p className="error-message">Please enter a number greater than the previous pulse index for each beacon.</p>}
    </div>
  );
};

export default TLock;
