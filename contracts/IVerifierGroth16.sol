// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Minimal interface for a Groth16 verifier. The concrete auto-generated
/// verifier may expose (a,b,c,input) arguments; an adapter contract can be
/// introduced later to conform to this interface if needed.
interface IVerifierGroth16 {
    /// @notice Verify a Groth16 proof with the given public signals.
    /// @dev Implementations should revert or return false on failure.
    function verifyProof(bytes calldata proof, uint256[] calldata publicSignals)
        external
        view
        returns (bool);
}

