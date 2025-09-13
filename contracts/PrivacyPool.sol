// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IVerifierGroth16} from "./IVerifierGroth16.sol";

/// @title PrivacyPool — Fixed-denomination, SBT-gated pool with ZK withdraws
/// @notice Simplified MVP for hackathon: deposits emit commitments; withdraws verify proofs,
///         enforce SBT gating and nullifier uniqueness, and transfer ERC20 denominations.
contract PrivacyPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Immutable config ---
    IERC20 public immutable token; // ERC20 used in the pool
    address public immutable sbt;  // Mizuhiki Verified SBT contract
    IVerifierGroth16 public immutable verifier; // Groth16 verifier adapter

    // --- Denominations ---
    mapping(uint256 => bool) public isSupportedDenomination;

    // --- Association root management ---
    bytes32 public associationRoot;
    uint64 public immutable inclusionDelayBlocks; // blocks after root publication
    mapping(bytes32 => uint64) public rootPublishedAt; // root => blockNumber

    // --- Nullifier set ---
    mapping(bytes32 => bool) public nullifierUsed;

    // --- Events ---
    event Deposit(uint256 indexed denomination, bytes32 indexed commitment, uint256 timestamp);
    event Withdraw(bytes32 indexed nullifier, uint256 indexed denomination, address indexed to, uint256 timestamp);
    event AssociationRootUpdated(bytes32 indexed newRoot, uint64 publishedAtBlock);

    constructor(
        address _owner,
        IERC20 _token,
        address _sbt,
        IVerifierGroth16 _verifier,
        uint256[] memory _denominations,
        uint64 _inclusionDelayBlocks
    ) Ownable(_owner) {
        require(address(_token) != address(0), "Pool: token zero");
        require(_sbt != address(0), "Pool: SBT zero");
        require(address(_verifier) != address(0), "Pool: verifier zero");
        // Optional interface check if SBT supports ERC721
        require(IERC165(_sbt).supportsInterface(type(IERC721).interfaceId), "Pool: SBT !ERC721");

        token = _token;
        sbt = _sbt;
        verifier = _verifier;
        inclusionDelayBlocks = _inclusionDelayBlocks;

        for (uint256 i = 0; i < _denominations.length; i++) {
            isSupportedDenomination[_denominations[i]] = true;
        }
    }

    // --- Modifiers ---
    modifier onlySbtHolder() {
        require(IERC721(sbt).balanceOf(msg.sender) > 0, "Pool: SBT required");
        _;
    }

    // --- User actions ---

    /// @notice Deposit a supported denomination into the pool with a commitment.
    function deposit(uint256 denomination, bytes32 commitment)
        external
        nonReentrant
        onlySbtHolder
    {
        require(isSupportedDenomination[denomination], "Pool: invalid denom");
        token.safeTransferFrom(msg.sender, address(this), denomination);
        emit Deposit(denomination, commitment, block.timestamp);
    }

    /// @notice Publish a new association root (operator/owner action), starting its inclusion delay.
    function publishAssociationRoot(bytes32 newRoot) external onlyOwner {
        associationRoot = newRoot;
        uint64 at = uint64(block.number);
        rootPublishedAt[newRoot] = at;
        emit AssociationRootUpdated(newRoot, at);
    }

    /// @notice Withdraw a supported denomination to a recipient after proof verification.
    /// @param denomination The fixed denomination to withdraw.
    /// @param recipient The destination address (recommend fresh address in UI).
    /// @param root The association Merkle root used in the proof.
    /// @param nullifier The nullifier for double-spend prevention.
    /// @param proof Encoded Groth16 proof (adapter-decoded).
    /// @param publicSignals Public signals aligned with the verifier adapter.
    function withdraw(
        uint256 denomination,
        address recipient,
        bytes32 root,
        bytes32 nullifier,
        bytes calldata proof,
        uint256[] calldata publicSignals
    ) external nonReentrant onlySbtHolder {
        require(isSupportedDenomination[denomination], "Pool: invalid denom");
        uint64 publishedAt = rootPublishedAt[root];
        require(publishedAt != 0, "Pool: unknown root");
        require(block.number >= publishedAt + inclusionDelayBlocks, "Pool: root not yet eligible");
        require(!nullifierUsed[nullifier], "Pool: nullifier used");

        bool ok = verifier.verifyProof(proof, publicSignals);
        require(ok, "Pool: invalid proof");

        nullifierUsed[nullifier] = true;
        token.safeTransfer(recipient, denomination);
        emit Withdraw(nullifier, denomination, recipient, block.timestamp);
    }
}

