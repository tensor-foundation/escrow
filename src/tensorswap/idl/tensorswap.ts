export type Tensorswap = {
  "version": "0.1.0",
  "name": "tensorswap",
  "instructions": [
    {
      "name": "initTswap",
      "accounts": [
        {
          "name": "tswap",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initPool",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation / will be stored inside pool"
          ]
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Needed for pool seeds derivation / paying fr stuff"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        }
      ]
    },
    {
      "name": "closePool",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Needed for pool seeds derivation / paying fr stuff"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        }
      ]
    },
    {
      "name": "depositNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, also checked via has_one on pool"
          ]
        },
        {
          "name": "nftSource",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Tied to the pool because used to verify pool seeds"
          ]
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "depositSol",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Tied to the pool because used to verify pool seeds"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, has_one = whitelist on pool"
          ]
        },
        {
          "name": "nftBuyerAcc",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account.",
            "This is closed below (dest = owner)"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, also checked via has_one on pool"
          ]
        },
        {
          "name": "nftSellerAcc",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tSwap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "config",
            "type": {
              "defined": "TSwapConfig"
            }
          },
          {
            "name": "feeVault",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "solEscrowBump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "tswap",
            "docs": [
              "Ownership & belonging"
            ],
            "type": "publicKey"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "whitelist",
            "docs": [
              "Collection stuff"
            ],
            "type": "publicKey"
          },
          {
            "name": "config",
            "docs": [
              "Config & calc"
            ],
            "type": {
              "defined": "PoolConfig"
            }
          },
          {
            "name": "takerSellCount",
            "docs": [
              "Accounting"
            ],
            "type": "u32"
          },
          {
            "name": "takerBuyCount",
            "type": "u32"
          },
          {
            "name": "nftsHeld",
            "type": "u32"
          },
          {
            "name": "solEscrow",
            "docs": [
              "Used by Trade / Token pools only",
              "Amount to spend is implied by balance - rent"
            ],
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "nftDepositReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "pool",
            "type": "publicKey"
          },
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "nftEscrow",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "solEscrow",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "types": [
    {
      "name": "TSwapConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "PoolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolType",
            "type": {
              "defined": "PoolType"
            }
          },
          {
            "name": "curveType",
            "type": {
              "defined": "CurveType"
            }
          },
          {
            "name": "startingPrice",
            "type": "u64"
          },
          {
            "name": "delta",
            "type": "u64"
          },
          {
            "name": "honorRoyalties",
            "type": "bool"
          },
          {
            "name": "mmFeeBps",
            "docs": [
              "Trade pools only"
            ],
            "type": {
              "option": "u16"
            }
          }
        ]
      }
    },
    {
      "name": "PoolType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Token"
          },
          {
            "name": "NFT"
          },
          {
            "name": "Trade"
          }
        ]
      }
    },
    {
      "name": "CurveType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Linear"
          },
          {
            "name": "Exponential"
          }
        ]
      }
    },
    {
      "name": "Direction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Up"
          },
          {
            "name": "Down"
          }
        ]
      }
    },
    {
      "name": "TakerSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidProof",
      "msg": "invalid merkle proof, token not whitelisted"
    },
    {
      "code": 6001,
      "name": "WhitelistNotVerified",
      "msg": "whitelist not verified -- currently only verified pools supported"
    },
    {
      "code": 6002,
      "name": "BadWhitelist",
      "msg": "unexpected whitelist address"
    },
    {
      "code": 6003,
      "name": "WrongPoolType",
      "msg": "operation not permitted on this pool type"
    },
    {
      "code": 6004,
      "name": "BadFeeAccount",
      "msg": "fee account doesn't match that stored on pool"
    },
    {
      "code": 6005,
      "name": "BadEscrowAccount",
      "msg": "escrow account doesn't match that stored on pool"
    },
    {
      "code": 6006,
      "name": "MissingFees",
      "msg": "when setting up a Trade pool, must provide fee bps & fee vault"
    },
    {
      "code": 6007,
      "name": "FeesTooHigh",
      "msg": "fees entered above allowed threshold"
    },
    {
      "code": 6008,
      "name": "DeltaTooLarge",
      "msg": "delta too large"
    },
    {
      "code": 6009,
      "name": "ArithmeticError",
      "msg": "arithmetic error"
    },
    {
      "code": 6010,
      "name": "WrongPool",
      "msg": "this nft doesnt belong to this pool"
    },
    {
      "code": 6011,
      "name": "RoyaltiesDisabled",
      "msg": "royalties are disabled for now"
    },
    {
      "code": 6012,
      "name": "PriceMismatch",
      "msg": "specified price does not match current price"
    },
    {
      "code": 6013,
      "name": "ExistingNfts",
      "msg": "cannot close pool with nfts in escrow -- withdraw all before closing"
    }
  ]
};

export const IDL: Tensorswap = {
  "version": "0.1.0",
  "name": "tensorswap",
  "instructions": [
    {
      "name": "initTswap",
      "accounts": [
        {
          "name": "tswap",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initPool",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation / will be stored inside pool"
          ]
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Needed for pool seeds derivation / paying fr stuff"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        }
      ]
    },
    {
      "name": "closePool",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Needed for pool seeds derivation / paying fr stuff"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        }
      ]
    },
    {
      "name": "depositNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, also checked via has_one on pool"
          ]
        },
        {
          "name": "nftSource",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Tied to the pool because used to verify pool seeds"
          ]
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "depositSol",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "Tied to the pool because used to verify pool seeds"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, has_one = whitelist on pool"
          ]
        },
        {
          "name": "nftBuyerAcc",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account.",
            "This is closed below (dest = owner)"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellNft",
      "accounts": [
        {
          "name": "tswap",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation"
          ]
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation, also checked via has_one on pool"
          ]
        },
        {
          "name": "nftSellerAcc",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Implicitly checked via transfer. Will fail if wrong account"
          ]
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": "PoolConfig"
          }
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tSwap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "config",
            "type": {
              "defined": "TSwapConfig"
            }
          },
          {
            "name": "feeVault",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "solEscrowBump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "tswap",
            "docs": [
              "Ownership & belonging"
            ],
            "type": "publicKey"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "whitelist",
            "docs": [
              "Collection stuff"
            ],
            "type": "publicKey"
          },
          {
            "name": "config",
            "docs": [
              "Config & calc"
            ],
            "type": {
              "defined": "PoolConfig"
            }
          },
          {
            "name": "takerSellCount",
            "docs": [
              "Accounting"
            ],
            "type": "u32"
          },
          {
            "name": "takerBuyCount",
            "type": "u32"
          },
          {
            "name": "nftsHeld",
            "type": "u32"
          },
          {
            "name": "solEscrow",
            "docs": [
              "Used by Trade / Token pools only",
              "Amount to spend is implied by balance - rent"
            ],
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "nftDepositReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "pool",
            "type": "publicKey"
          },
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "nftEscrow",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "solEscrow",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "types": [
    {
      "name": "TSwapConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "PoolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolType",
            "type": {
              "defined": "PoolType"
            }
          },
          {
            "name": "curveType",
            "type": {
              "defined": "CurveType"
            }
          },
          {
            "name": "startingPrice",
            "type": "u64"
          },
          {
            "name": "delta",
            "type": "u64"
          },
          {
            "name": "honorRoyalties",
            "type": "bool"
          },
          {
            "name": "mmFeeBps",
            "docs": [
              "Trade pools only"
            ],
            "type": {
              "option": "u16"
            }
          }
        ]
      }
    },
    {
      "name": "PoolType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Token"
          },
          {
            "name": "NFT"
          },
          {
            "name": "Trade"
          }
        ]
      }
    },
    {
      "name": "CurveType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Linear"
          },
          {
            "name": "Exponential"
          }
        ]
      }
    },
    {
      "name": "Direction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Up"
          },
          {
            "name": "Down"
          }
        ]
      }
    },
    {
      "name": "TakerSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidProof",
      "msg": "invalid merkle proof, token not whitelisted"
    },
    {
      "code": 6001,
      "name": "WhitelistNotVerified",
      "msg": "whitelist not verified -- currently only verified pools supported"
    },
    {
      "code": 6002,
      "name": "BadWhitelist",
      "msg": "unexpected whitelist address"
    },
    {
      "code": 6003,
      "name": "WrongPoolType",
      "msg": "operation not permitted on this pool type"
    },
    {
      "code": 6004,
      "name": "BadFeeAccount",
      "msg": "fee account doesn't match that stored on pool"
    },
    {
      "code": 6005,
      "name": "BadEscrowAccount",
      "msg": "escrow account doesn't match that stored on pool"
    },
    {
      "code": 6006,
      "name": "MissingFees",
      "msg": "when setting up a Trade pool, must provide fee bps & fee vault"
    },
    {
      "code": 6007,
      "name": "FeesTooHigh",
      "msg": "fees entered above allowed threshold"
    },
    {
      "code": 6008,
      "name": "DeltaTooLarge",
      "msg": "delta too large"
    },
    {
      "code": 6009,
      "name": "ArithmeticError",
      "msg": "arithmetic error"
    },
    {
      "code": 6010,
      "name": "WrongPool",
      "msg": "this nft doesnt belong to this pool"
    },
    {
      "code": 6011,
      "name": "RoyaltiesDisabled",
      "msg": "royalties are disabled for now"
    },
    {
      "code": 6012,
      "name": "PriceMismatch",
      "msg": "specified price does not match current price"
    },
    {
      "code": 6013,
      "name": "ExistingNfts",
      "msg": "cannot close pool with nfts in escrow -- withdraw all before closing"
    }
  ]
};
