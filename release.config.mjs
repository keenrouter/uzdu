/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["master", "dev"],
  plugins: ["@semantic-release/commit-analyzer", "@semantic-release/npm"]
};