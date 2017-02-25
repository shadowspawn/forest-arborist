Forest Arborist
===============

Provide convenient operations on a loosely coupled forest of repositories. The
forest can be nested under a main repo or siblings in a plain directory. Supports
both Git and Mercurial repositories. Inspired by experience with Mercurial subrepositories.

Uses a manifest file in the main repo and a marker file at the root of the forest.
Allows most commands to be run from anywhere in the forest, by searching up for
the root marker file.

Terminology:
* forest: a collection of repos and their working trees
* root: directory at the root of the forest
* manifest: lists dependent repos and other forest details
* main repo: where the manifest is stored


Getting Started
---------------

To create a manifest from an existing forest you run `init` from the main repo:

`fab init`

Commit the manifest file, and then you can `clone` the main repo to get the forest:

`fab clone ssh://user@host:/path`

If you have more than one combination of repos you use, such as different
platform libraries or production vs development, you can specify a manifest name:

    fab init --manifest mac
    fab clone --manifest mac ssh://user@host:/path


Reproducing Forest State
------------------------

There are three commands for reproducing forest state:
* `snapshot` produces a listing of the current forest and changesets
* `restore` takes the current forest back to the snapshot state
* `recreate` is like clone but takes a snapshot file

    fab snapshot > ~/snapshot1
    git pull
    fab restore ~/snapshot1
    cd ..
    fab recreate ~/snapshot1 myTempRepo


Working With Branches
---------------------

You can specify the starting branch when you make the clone:

    fab clone --branch ssh://user@host:/path

There are commands to make a new branch and to switch to an existing branch:

    fab make-branch feature/bells
    fab switch master


Dependent Repo Types
--------------------


The dependent repos can be configured in three ways:
* pinned to a specified changeset or tag
* locked to a specified branch
* free to follow the main repo

The various commands operate on an appropriate subset of the repos. For example
the switch command only affects the free repositories, the pull command affects
free and locked, and the status command runs on all the repos.

For more advanced uses there are two ways to run user supplied commands
across the forest, e.g.

    fab for-each git -- remote -v
    fab for-free git branch

---------------------------------------------------------------------------------


In Depth
========

_Documentation still a work in progress from here down_

Manifest Files
-------------

The manifest file can be automatically generated by:
* `fab init` from master repository for a nested forest
* `fab init --root ..` from main repo for a sibling forest
* `fab --manifest name` to save a custom manifest

The manifest specifies working directory names and origin repositories for forest,
relative to root. Origin supports paths relative to main repo. Dependent repos
can be pinned to a revision (pinRevision), locked to a branch (lockBranch),
or free and use the same branch as the main repo when specified for clone.

    {
      "dependencies": {
        "TestRenamed": {
          "origin": "git@github.com:JohnRGee/Test.git",
          "repoType": "git"
        }
      },
      "rootDirectory": ".."
    }


Commands Summary
----------------

    Usage: fab [options] [command]

    Commands:

     clone [-b, --branch <name>] [-m, --manifest <name>] <source> [destination]
                                                   clone source and install its dependencies
     init [--root <dir>] [-m, --manifest <name>]   add manifest in current directory, and marker file at root of forest
     install [-m, --manifest <name>]               clone missing (new) dependent repositories
     status                                        show concise status for each repo in the forest
     pull                                          git-style pull, which is fetch and merge
     root                                          show the root directory of the forest
     for-each <command> [args...]                  run specified command on each repo in the forest, e.g. "fab for-each ls -- -al"
     for-free <command> [args...]                  run specified command on repos which are not locked or pinned
     switch <branch>                               switch branch of free repos
     make-branch [-p, --publish] <branch> [start_point]  
                                                   create new branch in free repos
     snapshot                                      display state of forest
     recreate <snapshot> [destination]             clone repos to recreate forest in past state
     restore <snapshot>                            checkout repos to restore forest in past state

    Options:

      -h, --help     output usage information
      -V, --version  output the version number
      --debug        include debugging information, such as stack dump

    Files:
      .fab/manifest.json default manifest for forest
      .fab-root.json marks root of forest (do not commit to VCS)

    Forest management: clone, init, install
    Utility: status, pull, for-each, for-free
    Branch: make-branch, switch
    Reproducible state: snapshot, recreate, restore

    See https://github.com/JohnRGee/forest-arborist.git for usage overview.
    See also 'fab <command> --help' for command options and further help.


Installing
----------

Requires node and npm. Easy install:

    npm install --global @shadowspawn/forest-arborist

For more flexibility during development:

    git clone https://github.com/JohnRGee/forest-arborist.git
    cd forest-arborist
    npm install
    npm link


Status
------

* Pre-release. May still be breaking changes.
* OS: main development on Mac OS X, less testing on Microsoft Windows and Linux.
* DVCS: main development with git, less testing with hg.
