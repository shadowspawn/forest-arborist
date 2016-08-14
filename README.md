# arm

Another Repository Manager

Provide convenient management of a working group of repositories. Support a mixture of git and Mercurial repositories. Inspired by Mercurial subrepositories and hgh.

Use a dependencies file in the nominal master repo and a marker file in the root of the working group. Allow commands to be run from anywhere in the working group, by searching up for the marker file.

## Dependencies File Format (arm.json)

Working directory names and remote urls for working group, relative to root.

    {"dependencies":
       {
       "CrossPlatform": "ssh://hg@hg.adi.co.nz/hg/App/CrossPlatform#Stable",
       "Libs/Boost": "ssh://hg@hg.adi.co.nz/hg/Libs/BoostLite"}
       }
    }

c.f. npm package dependencies

## Usage

    Usage: arm [options] [command]


    Commands:

      init                 add dependencies file in current repo, and marker file at root of working group
      root                 show the root directory of the working group
      status               show the status of the working group

    Options:

      -h, --help     output usage information
      -V, --version  output the version number

    Files:
      arm.json contains repos for working group (dependencies of main repo)
      .arm-root.json marks root of working group

    See also 'arm <command> --help' if there are options on a subcommand.

## Installing

Requires node and npm.

    npm install --global git@github.com:JohnRGee/arm.git

(Or download and build the package, and add a shell alias pointing at arm.js.)
