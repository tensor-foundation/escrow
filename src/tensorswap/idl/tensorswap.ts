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
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
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
      "args": [
        {
          "name": "authBump",
          "type": "u8"
        }
      ]
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
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation / will be stored inside pool"
          ]
        },
        {
          "name": "creator",
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
          "name": "poolBump",
          "type": "u8"
        },
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
          "name": "authority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed to be set as authority on token escrows"
          ]
        },
        {
          "name": "pool",
          "isMut": false,
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
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
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
          "name": "authBump",
          "type": "u8"
        },
        {
          "name": "poolBump",
          "type": "u8"
        },
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
          "isMut": false,
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
          "name": "poolBump",
          "type": "u8"
        },
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed to be set as authority on token escrows"
          ]
        },
        {
          "name": "pool",
          "isMut": false,
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
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftDest",
          "isMut": false,
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
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buyer",
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
          "name": "authBump",
          "type": "u8"
        },
        {
          "name": "poolBump",
          "type": "u8"
        },
        {
          "name": "receiptBump",
          "type": "u8"
        },
        {
          "name": "escrowBump",
          "type": "u8"
        },
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
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "authBump",
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
            "name": "poolBump",
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
            "name": "creator",
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
              "Config"
            ],
            "type": {
              "defined": "PoolConfig"
            }
          },
          {
            "name": "tradeCount",
            "docs": [
              "Accounting"
            ],
            "type": "u64"
          },
          {
            "name": "nftsHeld",
            "type": "u32"
          },
          {
            "name": "solFunding",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
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
            "name": "currentPrice",
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
            "name": "feeBps",
            "docs": [
              "Trade pools only"
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "feeVault",
            "type": {
              "option": "publicKey"
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
      "msg": "whitelist pda address doesn't match"
    },
    {
      "code": 6003,
      "name": "WrongPoolType",
      "msg": "operation not permitted on this pool type"
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
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
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
      "args": [
        {
          "name": "authBump",
          "type": "u8"
        }
      ]
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
          "name": "whitelist",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed for pool seeds derivation / will be stored inside pool"
          ]
        },
        {
          "name": "creator",
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
          "name": "poolBump",
          "type": "u8"
        },
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
          "name": "authority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed to be set as authority on token escrows"
          ]
        },
        {
          "name": "pool",
          "isMut": false,
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
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
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
          "name": "authBump",
          "type": "u8"
        },
        {
          "name": "poolBump",
          "type": "u8"
        },
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
          "isMut": false,
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
          "name": "poolBump",
          "type": "u8"
        },
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Needed to be set as authority on token escrows"
          ]
        },
        {
          "name": "pool",
          "isMut": false,
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
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nftDest",
          "isMut": false,
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
          "name": "nftReceipt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buyer",
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
          "name": "authBump",
          "type": "u8"
        },
        {
          "name": "poolBump",
          "type": "u8"
        },
        {
          "name": "receiptBump",
          "type": "u8"
        },
        {
          "name": "escrowBump",
          "type": "u8"
        },
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
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "authBump",
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
            "name": "poolBump",
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
            "name": "creator",
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
              "Config"
            ],
            "type": {
              "defined": "PoolConfig"
            }
          },
          {
            "name": "tradeCount",
            "docs": [
              "Accounting"
            ],
            "type": "u64"
          },
          {
            "name": "nftsHeld",
            "type": "u32"
          },
          {
            "name": "solFunding",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
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
            "name": "currentPrice",
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
            "name": "feeBps",
            "docs": [
              "Trade pools only"
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "feeVault",
            "type": {
              "option": "publicKey"
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
      "msg": "whitelist pda address doesn't match"
    },
    {
      "code": 6003,
      "name": "WrongPoolType",
      "msg": "operation not permitted on this pool type"
    }
  ]
};
