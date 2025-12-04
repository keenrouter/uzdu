/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["master"],
  plugins: [
    ["@semantic-release/npm",
      {
        "npmPublish": false,
        "tarballDir": "tmpTar",
        "pkgRoot": "distTemp",
      }
    ],
  ]
};