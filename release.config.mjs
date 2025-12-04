/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["master", "dev"],
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