<!-- !!! DO NOT EDIT, THIS FILE IS GENERATED AUTOMATICALLY !!!  -->

> :information_source: Please, see the full project documentation here:<br><https://softvisio-node.github.io/msgpack/>

# Introduction

Fork of the `notepack.io` with improvements:

- Code optimizations.
- Streaming decoder.
- {Date} encoded with the standard msgpack protocol extension (breaking change).
- {BigInt} type support.

## Install

```shell
npm install @softvisio/msgpack
```

## Usage

```javascript
import * as msgpack from "@softvisio/msgpack";

const buffer = msgpack.encode( [ new Date() ] );

const data = msgpack.decode( buffer );
```

### msgpack.encode( data, encoding? )

- `data` {any} Data structire to encode.
- `encoding?` {string} Return string in the specified encoding.
- Returns: {Buffer|string} Encoded data. Returns {string} if `encoding` parameter is provided.

### msgpack.decode( data, encoding? )

- `data` {Buffer|ArrayBuffer|Uint8Array|string} Data to decode.
- `encoding?` {string} String encoding if `data` parameter is {string}.
- Returns: {any} Decoded data.

Throws error if unable to decode message.

### msgpack.decodeStream( data, offset )

- `data` {Buffer|ArrayBuffer|Uint8Array|string} Data to decode.
- `offset?` {integer} Offset of the message start in the passed data. **Default:** `0`.
- Returns: {Array}:
    - {any} Decoded data.
    - {integer} Offset of the decoded message end in the passed data.

Returns {undefined} if message is incomplete.

Throws error if unable to decode message.

## Custom extensions

Specification <https://github.com/msgpack/msgpack/blob/master/spec.md>.

| Type          | Codes       |
| ------------- | ----------- |
| {undefined}   | `0xd4 0x00` |
| {ArrayBuffer} | `0xc7 0x00` |
|               | `0xc8 0x00` |
|               | `0xc9 0x09` |
| {Date}        | `0xc7 0xff` |
| {BigInt}      | `0xc7 0x01` |
|               | `0xc8 0x01` |
|               | `0xc9 0x01` |
