// Minimal membership + nullifier circuit (Circom)
// Demo-oriented: Poseidon hash, small Merkle height.

pragma circom 2.1.4;

include "poseidon.circom";

template Membership(height) {
    // Public outputs (computed)
    signal output root;
    signal output nullifier;
    signal output denomIndex;

    // Public inputs (to expose as public signals)
    signal input root_pub;
    signal input nullifier_pub;
    signal input denomIndex_pub;

    // Private inputs
    signal input noteSecret;     // field element
    signal input denomIndexPriv; // must equal denomIndex
    signal input pathElements[height];
    signal input pathIndex[height]; // 0/1 as signals

    // Compute leaf commitment = Poseidon(noteSecret, denomIndex)
    component leafHash = Poseidon(2);
    leafHash.inputs[0] <== noteSecret;
    leafHash.inputs[1] <== denomIndexPriv;
    signal leaf;
    leaf <== leafHash.out;

    // Nullifier = Poseidon(noteSecret)
    component nullHash = Poseidon(1);
    nullHash.inputs[0] <== noteSecret;
    nullifier <== nullHash.out;

    // Enforce denomIndex equality
    denomIndex <== denomIndexPriv;

    // Merkle path recompute using Poseidon(2)
    signal cur[height + 1];
    signal oneMinus[height];
    signal left[height];
    signal right[height];
    signal t0_left[height];
    signal t1_left[height];
    signal t0_right[height];
    signal t1_right[height];
    component node[height];

    cur[0] <== leaf;
    for (var i = 0; i < height; i++) {
        // Constrain pathIndex to be boolean
        pathIndex[i] * (pathIndex[i] - 1) === 0;
        oneMinus[i] <== 1 - pathIndex[i];

        // left = (1 - pathIndex) * cur + pathIndex * pathElem
        t0_left[i] <== oneMinus[i] * cur[i];
        t1_left[i] <== pathIndex[i] * pathElements[i];
        left[i] <== t0_left[i] + t1_left[i];

        // right = pathIndex * cur + (1 - pathIndex) * pathElem
        t0_right[i] <== pathIndex[i] * cur[i];
        t1_right[i] <== oneMinus[i] * pathElements[i];
        right[i] <== t0_right[i] + t1_right[i];
        node[i] = Poseidon(2);
        node[i].inputs[0] <== left[i];
        node[i].inputs[1] <== right[i];
        cur[i + 1] <== node[i].out;
    }
    root <== cur[height];

    // Constrain public inputs to equal computed outputs
    root_pub === root;
    nullifier_pub === nullifier;
    denomIndex_pub === denomIndex;
}

component main {public [root_pub, nullifier_pub, denomIndex_pub]} = Membership(20);
