const MICRO_OPT_LEN = 32;

// Faster for short strings than buffer.write
function utf8Write ( arr, offset, str ) {
    let c = 0;
    for ( let i = 0, l = str.length; i < l; i++ ) {
        c = str.charCodeAt( i );
        if ( c < 0x80 ) {
            arr[ offset++ ] = c;
        }
        else if ( c < 0x800 ) {
            arr[ offset++ ] = 0xc0 | ( c >> 6 );
            arr[ offset++ ] = 0x80 | ( c & 0x3f );
        }
        else if ( c < 0xd800 || c >= 0xe000 ) {
            arr[ offset++ ] = 0xe0 | ( c >> 12 );
            arr[ offset++ ] = 0x80 | ( ( c >> 6 ) & 0x3f );
            arr[ offset++ ] = 0x80 | ( c & 0x3f );
        }
        else {
            i++;
            c = 0x10000 + ( ( ( c & 0x3ff ) << 10 ) | ( str.charCodeAt( i ) & 0x3ff ) );
            arr[ offset++ ] = 0xf0 | ( c >> 18 );
            arr[ offset++ ] = 0x80 | ( ( c >> 12 ) & 0x3f );
            arr[ offset++ ] = 0x80 | ( ( c >> 6 ) & 0x3f );
            arr[ offset++ ] = 0x80 | ( c & 0x3f );
        }
    }
}

// Faster for short strings than Buffer.byteLength
function utf8Length ( str ) {
    let c = 0,
        length = 0;
    for ( let i = 0, l = str.length; i < l; i++ ) {
        c = str.charCodeAt( i );
        if ( c < 0x80 ) {
            length += 1;
        }
        else if ( c < 0x800 ) {
            length += 2;
        }
        else if ( c < 0xd800 || c >= 0xe000 ) {
            length += 3;
        }
        else {
            i++;
            length += 4;
        }
    }
    return length;
}

const cache = new Map(),
    cacheMaxSize = 1024;

/* jshint latedef: nofunc */
function encodeKey ( bytes, defers, key ) {
    if ( cache.has( key ) ) {
        const buffer = cache.get( key );
        defers.push( { "bin": buffer, "length": buffer.length, "offset": bytes.length } );
        return buffer.length;
    }
    if ( cache.size > cacheMaxSize ) {
        return _encode( bytes, defers, key );
    }
    const keyBytes = [];
    const size = _encode( keyBytes, [], key );
    const keyBuffer = Buffer.allocUnsafe( size );
    for ( let i = 0, l = keyBytes.length; i < l; i++ ) {
        keyBuffer[ i ] = keyBytes[ i ];
    }
    utf8Write( keyBuffer, keyBytes.length, key );
    defers.push( { "bin": keyBuffer, "length": size, "offset": bytes.length } );
    cache.set( key, keyBuffer );
    return size;
}

function _encode ( bytes, defers, value ) {
    let hi = 0,
        lo = 0,
        length = 0,
        size = 0;

    // string
    if ( typeof value === "string" ) {
        if ( value.length > MICRO_OPT_LEN ) {
            length = Buffer.byteLength( value );
        }
        else {
            length = utf8Length( value );
        }

        if ( length < 0x20 ) {

            // fixstr
            bytes.push( length | 0xa0 );
            size = 1;
        }
        else if ( length < 0x100 ) {

            // str 8
            bytes.push( 0xd9, length );
            size = 2;
        }
        else if ( length < 0x10000 ) {

            // str 16
            bytes.push( 0xda, length >> 8, length );
            size = 3;
        }
        else if ( length < 0x100000000 ) {

            // str 32
            bytes.push( 0xdb, length >> 24, length >> 16, length >> 8, length );
            size = 5;
        }
        else {
            throw Error( "String too long" );
        }

        defers.push( { "str": value, "length": length, "offset": bytes.length } );

        return size + length;
    }

    // number
    else if ( typeof value === "number" ) {

        // TODO: encode to float 32?

        if ( Math.floor( value ) !== value || !isFinite( value ) ) {

            // float 64
            bytes.push( 0xcb );
            defers.push( { "float": value, "length": 8, "offset": bytes.length } );
            return 9;
        }

        if ( value >= 0 ) {
            if ( value < 0x80 ) {

                // positive fixnum
                bytes.push( value );
                return 1;
            }

            if ( value < 0x100 ) {

                // uint 8
                bytes.push( 0xcc, value );
                return 2;
            }

            if ( value < 0x10000 ) {

                // uint 16
                bytes.push( 0xcd, value >> 8, value );
                return 3;
            }

            if ( value < 0x100000000 ) {

                // uint 32
                bytes.push( 0xce, value >> 24, value >> 16, value >> 8, value );
                return 5;
            }

            // uint 64
            hi = ( value / 2 ** 32 ) >> 0;
            lo = value >>> 0;
            bytes.push( 0xcf, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo );
            return 9;
        }
        else {
            if ( value >= -0x20 ) {

                // negative fixnum
                bytes.push( value );
                return 1;
            }

            if ( value >= -0x80 ) {

                // int 8
                bytes.push( 0xd0, value );
                return 2;
            }

            if ( value >= -0x8000 ) {

                // int 16
                bytes.push( 0xd1, value >> 8, value );
                return 3;
            }

            if ( value >= -0x80000000 ) {

                // int 32
                bytes.push( 0xd2, value >> 24, value >> 16, value >> 8, value );
                return 5;
            }

            // int 64
            hi = Math.floor( value / 2 ** 32 );
            lo = value >>> 0;
            bytes.push( 0xd3, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo );
            return 9;
        }
    }

    // object
    else if ( typeof value === "object" ) {

        // null
        if ( value === null ) {
            bytes.push( 0xc0 );

            return 1;
        }

        // Array
        else if ( Array.isArray( value ) ) {
            length = value.length;

            if ( length < 0x10 ) {

                // fixarray
                bytes.push( length | 0x90 );
                size = 1;
            }
            else if ( length < 0x10000 ) {

                // array 16
                bytes.push( 0xdc, length >> 8, length );
                size = 3;
            }
            else if ( length < 0x100000000 ) {

                // array 32
                bytes.push( 0xdd, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Array too large" );
            }

            for ( let i = 0; i < length; i++ ) {
                size += _encode( bytes, defers, value[ i ] );
            }

            return size;
        }

        // Date
        else if ( value instanceof Date ) {
            const time = value.getTime();

            let sec, nano;

            if ( time >= 0 ) {
                sec = Math.trunc( time / 1000 );
                nano = Math.abs( time % 1000 ) * 1000000;
            }
            else {
                sec = Math.trunc( time / 1000 ) - 1;
                nano = ( 1000 + ( time % 1000 ) ) * 1000000;
            }

            hi = Math.floor( sec / 2 ** 32 );
            lo = sec >>> 0;

            bytes.push( 0xc7, 12, -1, nano >> 24, nano >> 16, nano >> 8, nano, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo );

            return 15;
        }

        // Buffer
        else if ( value instanceof Buffer ) {
            length = value.length;

            if ( length < 0x100 ) {

                // bin 8
                bytes.push( 0xc4, length );
                size = 2;
            }
            else if ( length < 0x10000 ) {

                // bin 16
                bytes.push( 0xc5, length >> 8, length );
                size = 3;
            }
            else if ( length < 0x100000000 ) {

                // bin 32
                bytes.push( 0xc6, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Buffer too large" );
            }

            defers.push( { "bin": value, "length": length, "offset": bytes.length } );

            return size + length;
        }

        // ArrayBuffer
        else if ( value instanceof ArrayBuffer || ArrayBuffer.isView( value ) ) {
            const arraybuffer = value.buffer || value;
            length = arraybuffer.byteLength;

            // ext 8
            if ( length < 0x100 ) {
                bytes.push( 0xc7, length, 0 );
                size = 3;
            }
            else if ( length < 0x10000 ) {

                // ext 16
                bytes.push( 0xc8, length >> 8, length, 0 );
                size = 4;
            }
            else if ( length < 0x100000000 ) {

                // ext 32
                bytes.push( 0xc9, length >> 24, length >> 16, length >> 8, length, 0 );
                size = 6;
            }
            else {
                throw Error( "ArrayBuffer too large" );
            }

            defers.push( { "arraybuffer": arraybuffer, "length": length, "offset": bytes.length } );

            return size + length;
        }

        // .toJSON() method
        else if ( typeof value.toJSON === "function" ) {
            return _encode( bytes, defers, value.toJSON() );
        }

        // Object
        else {
            const keys = [],
                allKeys = Object.keys( value );
            let key = "";

            for ( let i = 0, l = allKeys.length; i < l; i++ ) {
                key = allKeys[ i ];
                if ( typeof value[ key ] !== "function" ) {
                    keys.push( key );
                }
            }
            length = keys.length;

            if ( length < 0x10 ) {

                // fixmap
                bytes.push( length | 0x80 );
                size = 1;
            }
            else if ( length < 0x10000 ) {

                // map 16
                bytes.push( 0xde, length >> 8, length );
                size = 3;
            }
            else if ( length < 0x100000000 ) {

                // map 32
                bytes.push( 0xdf, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Object too large" );
            }

            for ( let i = 0; i < length; i++ ) {
                key = keys[ i ];
                size += encodeKey( bytes, defers, key );
                size += _encode( bytes, defers, value[ key ] );
            }

            return size;
        }
    }

    // Boolean
    else if ( typeof value === "boolean" ) {
        bytes.push( value ? 0xc3 : 0xc2 );

        return 1;
    }

    // undefined
    else if ( typeof value === "undefined" ) {
        bytes.push( 0xd4, 0, 0 );

        return 3;
    }

    // BigInt
    else if ( typeof value === "bigint" ) {
        value = value.toString();

        length = value.length;

        // ext 8
        if ( length < 0x100 ) {
            bytes.push( 0xc7, length, 1 );
            size = 3;
        }

        // ext 16
        else if ( length < 0x10000 ) {
            bytes.push( 0xc8, length >> 8, length, 1 );
            size = 4;
        }

        // ext 32
        else if ( length < 0x100000000 ) {
            bytes.push( 0xc9, length >> 24, length >> 16, length >> 8, length, 1 );
            size = 6;
        }
        else {
            throw Error( "BigInt too large" );
        }

        defers.push( { "str": value, "length": length, "offset": bytes.length } );

        return size + length;
    }

    // unsupported data type
    else {
        throw Error( "Could not encode" );
    }
}

export default function encode ( value, encoding ) {
    const bytes = [],
        defers = [],
        size = _encode( bytes, defers, value );
    const buf = Buffer.allocUnsafe( size );

    let deferIndex = 0,
        deferWritten = 0,
        nextOffset = -1;
    if ( defers.length > 0 ) {
        nextOffset = defers[ 0 ].offset;
    }

    let defer,
        deferLength = 0,
        offset = 0;
    for ( let i = 0, l = bytes.length; i < l; i++ ) {
        buf[ deferWritten + i ] = bytes[ i ];
        while ( i + 1 === nextOffset ) {
            defer = defers[ deferIndex ];
            deferLength = defer.length;
            offset = deferWritten + nextOffset;
            if ( defer.bin ) {
                if ( deferLength > MICRO_OPT_LEN ) {
                    defer.bin.copy( buf, offset, 0, deferLength );
                }
                else {
                    const bin = defer.bin;
                    for ( let j = 0; j < deferLength; j++ ) {
                        buf[ offset + j ] = bin[ j ];
                    }
                }
            }
            else if ( defer.str ) {
                if ( deferLength > MICRO_OPT_LEN ) {
                    buf.write( defer.str, offset, deferLength, "utf8" );
                }
                else {
                    utf8Write( buf, offset, defer.str );
                }
            }
            else if ( defer.float !== undefined ) {
                buf.writeDoubleBE( defer.float, offset );
            }
            else if ( defer.arraybuffer ) {
                const arr = new Uint8Array( defer.arraybuffer );
                for ( let k = 0; k < deferLength; k++ ) {
                    buf[ offset + k ] = arr[ k ];
                }
            }
            deferIndex++;
            deferWritten += deferLength;
            if ( defers[ deferIndex ] ) {
                nextOffset = defers[ deferIndex ].offset;
            }
            else {
                break;
            }
        }
    }

    if ( encoding ) {
        return buf.toString( encoding );
    }
    else {
        return buf;
    }
}
