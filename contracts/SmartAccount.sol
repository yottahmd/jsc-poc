// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SmartAccount (SCA) — Minimal single-owner account with signature + nonce authorization
/// @notice Executes arbitrary calls authorized by the owner via EIP-712 signatures.
contract SmartAccount is Ownable, EIP712, ReentrancyGuard {
    /// @dev Monotonically increasing nonce for replay protection.
    uint256 public nonce;

    /// @dev Typed data for call authorization.
    struct ExecRequest {
        address to;
        uint256 value;
        bytes data;
        uint256 nonce;
        uint256 chainId;
    }

    bytes32 private constant EXEC_TYPEHASH = keccak256(
        "ExecRequest(address to,uint256 value,bytes data,uint256 nonce,uint256 chainId)"
    );

    event Executed(address indexed to, uint256 value, bytes32 dataHash, uint256 indexed usedNonce);

    constructor(address initialOwner)
        Ownable(initialOwner)
        EIP712("MizuSCA", "1")
    {}

    receive() external payable {}

    /// @notice Execute a call authorized by the owner via EIP-712 signature.
    function execute(ExecRequest calldata req, bytes calldata signature)
        external
        nonReentrant
        returns (bytes memory result)
    {
        require(req.nonce == nonce, "SCA: bad nonce");
        require(req.chainId == block.chainid, "SCA: bad chainId");

        bytes32 structHash = keccak256(
            abi.encode(
                EXEC_TYPEHASH,
                req.to,
                req.value,
                keccak256(req.data),
                req.nonce,
                req.chainId
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == owner(), "SCA: invalid signature");

        unchecked {
            ++nonce;
        }

        (bool ok, bytes memory ret) = req.to.call{value: req.value}(req.data);
        require(ok, "SCA: call failed");
        emit Executed(req.to, req.value, keccak256(req.data), req.nonce);
        return ret;
    }
}

