function utf8Write ( view, offset, str ) {
    var c = 0;
    for ( var i = 0, l = str.length; i < l; i++ ) {
        c = str.charCodeAt( i );
        if ( c < 0x80 ) {
            view.setUint8( offset++, c );
        }
        else if ( c < 0x800 ) {
            view.setUint8( offset++, 0xc0 | ( c >> 6 ) );
            view.setUint8( offset++, 0x80 | ( c & 0x3f ) );
        }
        else if ( c < 0xd800 || c >= 0xe000 ) {
            view.setUint8( offset++, 0xe0 | ( c >> 12 ) );
            view.setUint8( offset++, 0x80 | ( ( c >> 6 ) & 0x3f ) );
            view.setUint8( offset++, 0x80 | ( c & 0x3f ) );
        }
        else {
            i++;
            c = 0x10000 + ( ( ( c & 0x3ff ) << 10 ) | ( str.charCodeAt( i ) & 0x3ff ) );
            view.setUint8( offset++, 0xf0 | ( c >> 18 ) );
            view.setUint8( offset++, 0x80 | ( ( c >> 12 ) & 0x3f ) );
            view.setUint8( offset++, 0x80 | ( ( c >> 6 ) & 0x3f ) );
            view.setUint8( offset++, 0x80 | ( c & 0x3f ) );
        }
    }
}

function utf8Length ( str ) {
    var c = 0,
        length = 0;
    for ( var i = 0, l = str.length; i < l; i++ ) {
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

function _encode ( bytes, defers, value ) {
    var type = typeof value,
        i = 0,
        l = 0,
        hi = 0,
        lo = 0,
        length = 0,
        size = 0;

    // string
    if ( type === "string" ) {
        length = utf8Length( value );

        // fixstr
        if ( length < 0x20 ) {
            bytes.push( length | 0xa0 );
            size = 1;
        }

        // str 8
        else if ( length < 0x100 ) {
            bytes.push( 0xd9, length );
            size = 2;
        }

        // str 16
        else if ( length < 0x10000 ) {
            bytes.push( 0xda, length >> 8, length );
            size = 3;
        }

        // str 32
        else if ( length < 0x100000000 ) {
            bytes.push( 0xdb, length >> 24, length >> 16, length >> 8, length );
            size = 5;
        }
        else {
            throw Error( "String too long" );
        }

        defers.push( { "_str": value, "_length": length, "_offset": bytes.length } );

        return size + length;
    }

    // number
    else if ( type === "number" ) {

        // TODO: encode to float 32?

        // float 64
        if ( Math.floor( value ) !== value || !isFinite( value ) ) {
            bytes.push( 0xcb );
            defers.push( { "_float": value, "_length": 8, "_offset": bytes.length } );

            return 9;
        }

        if ( value >= 0 ) {

            // positive fixnum
            if ( value < 0x80 ) {
                bytes.push( value );

                return 1;
            }

            // uint 8
            if ( value < 0x100 ) {
                bytes.push( 0xcc, value );

                return 2;
            }

            // uint 16
            if ( value < 0x10000 ) {
                bytes.push( 0xcd, value >> 8, value );

                return 3;
            }

            // uint 32
            if ( value < 0x100000000 ) {
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

            // negative fixnum
            if ( value >= -0x20 ) {
                bytes.push( value );
                return 1;
            }

            // int 8
            if ( value >= -0x80 ) {
                bytes.push( 0xd0, value );
                return 2;
            }

            // int 16
            if ( value >= -0x8000 ) {
                bytes.push( 0xd1, value >> 8, value );
                return 3;
            }

            // int 32
            if ( value >= -0x80000000 ) {
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
    else if ( type === "object" ) {

        // null
        if ( value === null ) {
            bytes.push( 0xc0 );

            return 1;
        }

        // Array
        else if ( Array.isArray( value ) ) {
            length = value.length;

            // fixarray
            if ( length < 0x10 ) {
                bytes.push( length | 0x90 );
                size = 1;
            }

            // array 16
            else if ( length < 0x10000 ) {
                bytes.push( 0xdc, length >> 8, length );
                size = 3;
            }

            // array 32
            else if ( length < 0x100000000 ) {
                bytes.push( 0xdd, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Array too large" );
            }

            for ( i = 0; i < length; i++ ) {
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

        // ArrayBuffer
        else if ( value instanceof ArrayBuffer ) {
            length = value.byteLength;

            // bin 8
            if ( length < 0x100 ) {
                bytes.push( 0xc4, length );
                size = 2;
            }

            // bin 16
            else if ( length < 0x10000 ) {
                bytes.push( 0xc5, length >> 8, length );
                size = 3;
            }

            // bin 32
            else if ( length < 0x100000000 ) {
                bytes.push( 0xc6, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Buffer too large" );
            }

            defers.push( { "_bin": value, "_length": length, "_offset": bytes.length } );

            return size + length;
        }

        // .toJSON() method
        else if ( typeof value.toJSON === "function" ) {
            return _encode( bytes, defers, value.toJSON() );
        }

        // object
        else {
            var keys = [],
                key = "";

            var allKeys = Object.keys( value );
            for ( i = 0, l = allKeys.length; i < l; i++ ) {
                key = allKeys[ i ];
                if ( typeof value[ key ] !== "function" ) {
                    keys.push( key );
                }
            }
            length = keys.length;

            // fixmap
            if ( length < 0x10 ) {
                bytes.push( length | 0x80 );
                size = 1;
            }

            // map 16
            else if ( length < 0x10000 ) {
                bytes.push( 0xde, length >> 8, length );
                size = 3;
            }

            // map 32
            else if ( length < 0x100000000 ) {
                bytes.push( 0xdf, length >> 24, length >> 16, length >> 8, length );
                size = 5;
            }
            else {
                throw Error( "Object too large" );
            }

            for ( i = 0; i < length; i++ ) {
                key = keys[ i ];
                size += _encode( bytes, defers, key );
                size += _encode( bytes, defers, value[ key ] );
            }

            return size;
        }
    }

    // boolean
    else if ( type === "boolean" ) {
        bytes.push( value ? 0xc3 : 0xc2 );

        return 1;
    }

    // undefined
    else if ( type === "undefined" ) {
        bytes.push( 0xd4, 0, 0 );

        return 3;
    }

    // BigInt
    else if ( type === "bigint" ) {
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

        defers.push( { "_str": value, "_length": length, "_offset": bytes.length } );

        return size + length;
    }

    // unsupported data type
    else {
        throw Error( "Could not encode" );
    }
}

export default function encode ( value ) {
    var bytes = [];
    var defers = [];
    var size = _encode( bytes, defers, value );
    var buf = new ArrayBuffer( size );
    var view = new DataView( buf );

    var deferIndex = 0;
    var deferWritten = 0;
    var nextOffset = -1;
    if ( defers.length > 0 ) {
        nextOffset = defers[ 0 ]._offset;
    }

    var defer,
        deferLength = 0,
        offset = 0;
    for ( var i = 0, l = bytes.length; i < l; i++ ) {
        view.setUint8( deferWritten + i, bytes[ i ] );
        if ( i + 1 !== nextOffset ) {
            continue;
        }
        defer = defers[ deferIndex ];
        deferLength = defer._length;
        offset = deferWritten + nextOffset;
        if ( defer._bin ) {
            var bin = new Uint8Array( defer._bin );
            for ( var j = 0; j < deferLength; j++ ) {
                view.setUint8( offset + j, bin[ j ] );
            }
        }
        else if ( defer._str ) {
            utf8Write( view, offset, defer._str );
        }
        else if ( defer._float !== undefined ) {
            view.setFloat64( offset, defer._float );
        }
        deferIndex++;
        deferWritten += deferLength;
        if ( defers[ deferIndex ] ) {
            nextOffset = defers[ deferIndex ]._offset;
        }
    }

    return buf;
}
