module.exports = {
    "extends": "airbnb-base",
    "globals": {
        "it": true,
        "describe": true
    },
    "env": {
        "node": 1
    },
    "rules": {
        "no-use-before-define": 0,
        "no-param-reassign": 0,
        "no-restricted-syntax": 0, // alow for-of
        // this code is literally a parser, let's allow parser idioms
        "no-continue": 0,
        "no-cond-assign": 0,
        "no-bitwise": 0,
        "no-plusplus": 0,
        "comma-dangle": 0 // node 6 compat
    }
};