// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal interface for contracts exposing an owner() view.
interface IHasOwner {
    function owner() external view returns (address);
}

