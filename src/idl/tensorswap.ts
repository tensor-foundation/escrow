export type Tensorswap = {
  "version": "0.1.0",
  "name": "tensorswap",
  "instructions": [
    {
      "name": "initPool",
      "accounts": [
        {
          "name": "helloWorld",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initTswap",
      "accounts": [
        {
          "name": "tswap",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
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
    }
  ],
  "accounts": [
    {
      "name": "tensorswap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hello",
            "type": "u64"
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
            "name": "hello",
            "type": "u64"
          }
        ]
      }
    }
  ]
};

export const IDL: Tensorswap = {
  "version": "0.1.0",
  "name": "tensorswap",
  "instructions": [
    {
      "name": "initPool",
      "accounts": [
        {
          "name": "helloWorld",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initTswap",
      "accounts": [
        {
          "name": "tswap",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
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
    }
  ],
  "accounts": [
    {
      "name": "tensorswap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hello",
            "type": "u64"
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
            "name": "hello",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
