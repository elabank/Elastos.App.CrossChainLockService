#!/usr/bin/env bash

echo "合约地址账号余额:"

curl -X POST \
  http://52.205.30.16:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["$1","latest"],"id":1}'


echo "发起地址账号1余额:"
  curl -X POST \
  http://52.205.30.16:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x9605a6E69b0c969E8473a9C27f0C2325685A9927","latest"],"id":1}'


  echo "参与账号2余额:"
    curl -X POST \
  http://52.205.30.16:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xc6d69F1339a72E484CCfe03BF2e339757f18c880","latest"],"id":1}'

  echo "参与账号3余额:"
    curl -X POST \
  http://52.205.30.16:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xDED1626C15F18bb35048BCf1068158634F628201","latest"],"id":1}'
