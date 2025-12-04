/**
 * @type {{ plugins: (string | [string, {pkgRoot: string}])[]}}
 *     ["@semantic-release/npm", {pkgRoot: "distTemp"}],
 */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator"
  ]
};