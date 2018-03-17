# npm-scripts

Details of the custom npm scripts.

    npm run copy-down

Merge master branch down into develop and set prerelease version, ready for more dev-ing.

Use: after publishing.

    npm run copy-up

Merge develop branch into master and remind about next steps.

Use: before publishing.

    npm run prepare

Compile the typescript to javascript.

Called automatically before publish and after install. Don't need to call manually under normal circumstances.

    npm run pull

git pull and apply the changes.

Use: to pickup and apply upstream changes when working with fab as a linked command rather than installed.

    npm run test
    npm test

Run the full suite of tests: CLI and unit tests.
