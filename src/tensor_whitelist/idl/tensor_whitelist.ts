export type TensorWhitelist = {
  "version": "0.1.0",
  "name": "tensor_whitelist",
  "instructions": [
    {
      "name": "initUpdateAuthority",
      "accounts": [
        {
          "name": "whitelistAuthority",
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
      "args": [
        {
          "name": "newOwner",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "initUpdateWl",
      "accounts": [
        {
          "name": "whitelist",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelistAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "there can only be 1 whitelist authority (due to seeds),",
            "and we're checking that 1)the correct owner is present on it, and 2)is a signer"
          ]
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
          "name": "bumpAuth",
          "type": "u8"
        },
        {
          "name": "uuid",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "rootHash",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "name",
          "type": {
            "option": {
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
      "name": "whitelistAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "collectionWhitelist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "verified",
            "type": "bool"
          },
          {
            "name": "rootHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "uuid",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "BadOwner",
      "msg": "passed in owner doesnt have the rights to do this"
    },
    {
      "code": 6001,
      "name": "MissingRootHash",
      "msg": "missing root hash"
    },
    {
      "code": 6002,
      "name": "MissingName",
      "msg": "missing name"
    }
  ]
};

export const IDL: TensorWhitelist = {
  "version": "0.1.0",
  "name": "tensor_whitelist",
  "instructions": [
    {
      "name": "initUpdateAuthority",
      "accounts": [
        {
          "name": "whitelistAuthority",
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
      "args": [
        {
          "name": "newOwner",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "initUpdateWl",
      "accounts": [
        {
          "name": "whitelist",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whitelistAuthority",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "there can only be 1 whitelist authority (due to seeds),",
            "and we're checking that 1)the correct owner is present on it, and 2)is a signer"
          ]
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
          "name": "bumpAuth",
          "type": "u8"
        },
        {
          "name": "uuid",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "rootHash",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "name",
          "type": {
            "option": {
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
      "name": "whitelistAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "collectionWhitelist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "verified",
            "type": "bool"
          },
          {
            "name": "rootHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "uuid",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "BadOwner",
      "msg": "passed in owner doesnt have the rights to do this"
    },
    {
      "code": 6001,
      "name": "MissingRootHash",
      "msg": "missing root hash"
    },
    {
      "code": 6002,
      "name": "MissingName",
      "msg": "missing name"
    }
  ]
};
