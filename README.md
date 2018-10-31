# DataVis

# User

## Traditional Web Site

* Run `make`.
* Copy `dist/wcdatavis.js` and `dist/wcdatavis.css` to your server.
* Include them like any other JS and CSS files.

# Developer

## Managing Branches

* For bug fixes, commit into the `stable` branch and merge to `master`.
* For minor new features and refactoring, commit into `master` and merge into `stable` when they're well tested.
* For major new features, commit to a feature branch, merging from `master` to keep up-to-date.  When done, merge info `master` and delete the feature branch.  Merge from `master` to `stable` when you're ready.
