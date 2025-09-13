// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifierGroth16} from "./IVerifierGroth16.sol";
import {IVerifierStandard} from "./IVerifierStandard.sol";

/// @title VerifierAdapter
/// @notice Adapts snarkjs/circom Groth16 Verifier.verifyProof(a,b,c,input) to
///         the IVerifierGroth16 interface expected by PrivacyPool.
/// @dev Expects `proof` to be abi.encode(a, b, c) with the following shapes:
///      - a: uint256[2]
///      - b: uint256[2][2]
///      - c: uint256[2]
contract VerifierAdapter is IVerifierGroth16 {
    IVerifierStandard public immutable underlying;

    constructor(address _underlying) {
        underlying = IVerifierStandard(_underlying);
    }

    function verifyProof(bytes calldata proof, uint256[] calldata publicSignals)
        external
        view
        returns (bool)
    {
        (uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c) =
            abi.decode(proof, (uint256[2], uint256[2][2], uint256[2]));
        return underlying.verifyProof(a, b, c, publicSignals);
    }
}

