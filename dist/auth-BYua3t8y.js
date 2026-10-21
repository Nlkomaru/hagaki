//#region src/auth/index.ts
const defaultNameFormat = (input) => input.id ? `${input.name} (${input.id})` : input.name;
function makeCommitter(input) {
	const email = input.email ?? input.defaultEmail;
	if (!email) throw new Error("hagaki: makeCommitter requires either `email` or `defaultEmail`");
	return {
		name: (input.nameFormat ?? defaultNameFormat)({
			id: input.id,
			name: input.name
		}),
		email
	};
}
//#endregion
export { makeCommitter as t };

//# sourceMappingURL=auth-BYua3t8y.js.map