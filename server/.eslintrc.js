module.exports = {
  env: {
    node: true,     // Enables Node.js global variables like `process`
    es2021: true
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script"
  },
  rules: {
    "no-unused-vars": "warn"
  }
};
