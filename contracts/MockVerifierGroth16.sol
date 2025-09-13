// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifierGroth16} from "./IVerifierGroth16.sol";

/// @title MockVerifierGroth16
/// @notice Demo-only verifier that unconditionally returns true.
/// @dev Use ONLY for demo mode. Real deployments must replace with an actual Groth16 verifier.
contract MockVerifierGroth16 is IVerifierGroth16 {
    function verifyProof(bytes calldata, uint256[] calldata) external pure returns (bool) {
        return true;
    }
}

