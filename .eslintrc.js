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
        "no-restricted-syntax": 0 // alow for-of
    }
};