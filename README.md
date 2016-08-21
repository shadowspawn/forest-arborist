# arm

Another Repository Manager

Provide convenient operations on a forest of repositories. The forest can be nested under a master repo or siblings in a plain directory. Support both Git and Mercurial repositories. Inspired by experience with Mercurial subrepositories.

Uses a configuration file in the forest and a marker file at the root of the forest. Allow commands to be run from anywhere in the forest, by searching up for the root marker file.

Terminology
* forest: a collection of repos and their working trees.
* root: directory at the root of the forest.

Other name ideas
* fab: forest arborist
* farm: forest arborist - repo manager, for all repos mentioned

## Configuration File Format (arm.json)

The config file can be automatically generated by:
* `arm init` from master repository for a nested forest
* `arm init --root ..` from main repo for a sibling forest

arm.json specifies working directory names and origin repositories for forest, relative to root.

    {
      "dependencies": {
        "TestRenamed": {
          "origin": "git@github.com:JohnRGee/Test.git",
          "repoType": "git"
        }
      },
      "rootDirectory": ".."
    }

## Usage

    Usage: arm [options] [command]


    Commands:

      clone <source> [destination]  clone source and install its dependencies
      init [options]                add config file in current directory, and marker file at root of forest
      install                       clone missing (new) dependent repositories
      outgoing                      show changesets not in the default push location
      pull                          git-style pull, which is fetch and merge
      root                          show the root directory of the forest
      status                        show concise status for each repo in the forest

    Options:

      -h, --help     output usage information
      -V, --version  output the version number

    Files:
      arm.json configuration file for forest, especially dependencies
      .arm-root.json marks root of forest

    Commands starting with an underscore are still in development.
    See also https://github.com/JohnRGee/arm.git for usage overview.
    See also 'arm <command> --help' if there are options on a subcommand.

## Installing

Requires node and npm. Easy unix install:

    npm install --global https://github.com/JohnRGee/arm.git

On Windows or to manage install location and command yourself:

    npm install https://github.com/JohnRGee/arm.git

and setup command to run "node <installFolder>arm.js".

## Status

Pre-release. "arm init" is great for trying out on an existing checkout.

Active development on OS X. Limited testing on Microsoft Windows.
