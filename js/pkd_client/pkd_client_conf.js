/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

pkdConf = {
    authURL: 'https://auth.easycrypt.co',
    pkdURL: 'https://pkd.easycrypt.co',
    numBits: 4096,
    api: {
        base: 'https://pkd.easycrypt.co',
        getPublicKeys: '/public/keys',
        addKeyPair: '/user/keys',
        getKeyPair: '/user/keys'
    }
}