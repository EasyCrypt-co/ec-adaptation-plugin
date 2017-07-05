EasyCrypt Adaptation Plugin for RoundCube
=========================================
[EasyCrypt](https://easycrypt.co)


INTRODUCTION
------------
The Adaptation Plugin provides several functions for adaptation of RoundCube to EasyCrypt email privacy service.
This includes partial handling of EasyCrypt message transport, adaptation of RoundCube UI to EasyCrypt,
client-side message caching and client-side PGP/MIME support.

The code is  written mainly in PHP and JavaScript and includes other open-source classes/libraries from [Select2][select2].

INSTALLATION
------------
- Place this plugin folder into the plugins directory of Roundcube
- Add ec_adaptation to $config['plugins'] in your Roundcube config

When downloading the plugin from GitHub you will need to create a
directory called ec_adaptation and place the files there, ignoring the
root directory in the downloaded archive.

CONFIG
------
The default config file is plugins/ec_adaptation/js/ec_client_cfg.js.dist
Rename it to plugins/ec_adaptation/js/ec_client_cfg.js

CONTACT
-------
For bug reports or feature requests please refer to the tracking system
at [Github][githubissues] or email us at support(at)easycrypt(dot)com
