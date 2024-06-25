const path = require('path');
resolve: { 
    fallback: {
        crypto: require.resolve("crypto-browserify")
    }
}