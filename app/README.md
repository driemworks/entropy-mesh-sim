# Entropy Mesh Simulator

This is an example app to simulate the creation, evolution, and usage of an entropy mesh as envisioned for use in the Ideal network.

## Entropy Mesh

The entropy mesh is a merkle-clock DAG where each node holds a pulse which is the output of an interoperable randomness beacon.

## Interoperable Randomness Beacons

We simulate an interoperable randomness beacon by using the test functions exposed by the etf-sdk library. Specifically, we randomly seed K beacons by generating pseudo-random seeds. We also assume that each beacon only has a single operator (so no interpolation is needed).