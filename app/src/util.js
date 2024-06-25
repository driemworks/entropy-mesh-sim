export function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
  }

export function buildUri(chainId, pulseIndex) {
    return '/beacon/2.0/chain/' + chainId + '/pulse/' + pulseIndex;
}