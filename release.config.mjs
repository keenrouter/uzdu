/**
 * @type {{ plugins: (string | [string, {pkgRoot: string}])[]}}
 */
export default {
  branches: ["master", "main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", {pkgRoot: "distTemp"}],
    "@semantic-release/github",
  ]
};