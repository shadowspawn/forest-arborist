// Entry point for npm run script to create playground.
import * as fs from "fs";
// Mine
import * as sandpit from "../dev/sandpit";

if (fs.existsSync("playground")) {
  console.log("playground already exists, skipping");
} else {
  sandpit.makePlayground("playground");
  console.log(
    "\nCreated playground with nested and sibling forests, ready to play.",
  );
}
