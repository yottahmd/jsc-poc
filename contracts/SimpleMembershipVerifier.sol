// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifierGroth16} from "./IVerifierGroth16.sol";

/// @title SimpleMembershipVerifier
/// @notice Simplest non-ZK verifier that checks a Merkle inclusion path and
///         basic note/nullifier relations. This is for hackathon/demo only.
/// @dev Public signals layout (uint256[]):
///      [0] root (bytes32)
///      [1] nullifier (bytes32)
///      [2] denom (uint256)
///
///      Encoded proof bytes (abi.encode):
///      (bytes32 leafCommitment, bytes32[] siblings, uint256 pathBits, bytes32 noteSecret)
///
///      Relations enforced:
///      - root == merkle(leafCommitment, siblings, pathBits)
///      - nullifier == keccak256(noteSecret)
///      - leafCommitment == keccak256(noteSecret || denom)
contract SimpleMembershipVerifier is IVerifierGroth16 {
    function verifyProof(bytes calldata proof, uint256[] calldata publicSignals)
        external
        pure
        returns (bool)
    {
        if (publicSignals.length < 3) return false;

        bytes32 root = bytes32(publicSignals[0]);
        bytes32 expectedNullifier = bytes32(publicSignals[1]);
        uint256 denom = publicSignals[2];

        (bytes32 leaf, bytes32[] memory siblings, uint256 pathBits, bytes32 noteSecret) =
            abi.decode(proof, (bytes32, bytes32[], uint256, bytes32));

        // Check nullifier relation
        if (keccak256(abi.encodePacked(noteSecret)) != expectedNullifier) return false;

        // Check leaf relation
        bytes32 computedLeaf = keccak256(abi.encodePacked(noteSecret, denom));
        if (computedLeaf != leaf) return false;

        // Compute Merkle root using keccak256 and direction bits in pathBits
        bytes32 h = leaf;
        for (uint256 i = 0; i < siblings.length; i++) {
            bool right = ((pathBits >> i) & 1) == 1;
            h = right
                ? keccak256(abi.encodePacked(siblings[i], h))
                : keccak256(abi.encodePacked(h, siblings[i]));
        }

        return h == root;
    }
}

