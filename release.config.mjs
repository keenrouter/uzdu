/**
 * @type {{ plugins: (string | [string, {pkgRoot: string}])[]}}
 */
export default {
  branches: ["master"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    ["@semantic-release/npm", {pkgRoot: "distTemp"}],
  ]
};