# arm

Another Repository Manager

Provide convenient operations on a forest of repositories. Support a mixture of Git and Mercurial repositories. Inspired by Mercurial subrepositories and hgh.

Uses a dependencies file in the forest and a marker file at the root of the forest. Allow commands to be run from anywhere in the forest, by searching up for the marker file.

Terminology
* forest: a group of repos and their working trees. (or _working group_?)
* root: directory at the root of the forest. Might a repo if using nesting, or a plain folder if repos are siblings.


## Dependencies File Format (arm.json)

Working directory names and remote urls for forest, relative to root.

    {"dependencies":
       {
       "CrossPlatform": "ssh://hg@hg.adi.co.nz/hg/App/CrossPlatform#Stable",
       "Libs/Boost": "ssh://hg@hg.adi.co.nz/hg/Libs/BoostLite"}
       }
    }

## Usage

    Usage: arm [options] [command]


    Commands:

      clone <source-URL> [group-dir]  clone source-URL and and installing its dependencies
      init                            add config file in current directory, and marker file at root of forest
      install                         clone missing (new) dependent repositories
      root                            show the root directory of the forest
      status                          show the status of each repo in the forest

    Options:

      -h, --help     output usage information
      -V, --version  output the version number

    Files:
      arm.json configuration file for forest, especially dependencies
      .arm-root.json marks root of forest


    See also 'arm <command> --help' if there are options on a subcommand.

## Installing

Requires node and npm. Easy unix install:

    npm install --global https://github.com/JohnRGee/arm.git

Or more manual, (git clone and/or) npm install and setup command for "node <installFolder>arm.js".

## Status

Pre-release, limited feature-set as yet. "arm init" is great for trying out on an existing checkout.

Active development on OS X. Testing still to come on Microsoft Windows.
