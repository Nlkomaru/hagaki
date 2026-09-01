// src/auth/index.ts
var defaultNameFormat = (input) => input.id ? `${input.name} (${input.id})` : input.name;
function makeCommitter(input) {
  const email = input.email ?? input.defaultEmail;
  if (!email) {
    throw new Error(
      "hagaki: makeCommitter requires either `email` or `defaultEmail`"
    );
  }
  const formatter = input.nameFormat ?? defaultNameFormat;
  return {
    name: formatter({ id: input.id, name: input.name }),
    email
  };
}

export { makeCommitter };
//# sourceMappingURL=chunk-Z2DKOU4M.js.map
//# sourceMappingURL=chunk-Z2DKOU4M.js.map