import { t as makeCommitter } from "./auth-BYua3t8y.js";
import { Octokit } from "octokit";
import matter from "gray-matter";
//#region src/api/commits.ts
async function getCommitWithChecks(deps, commitSha) {
	const { octokit, owner, repo } = deps;
	const commit = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
		owner,
		repo,
		ref: commitSha
	});
	const checks = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}/check-runs", {
		owner,
		repo,
		ref: commitSha
	});
	return {
		commit: commit.data,
		checks: checks.data
	};
}
//#endregion
//#region src/api/content.ts
function joinUrl(base, path) {
	return `${base.endsWith("/") ? base.slice(0, -1) : base}${path.startsWith("/") ? path : `/${path}`}`;
}
function postsPath(c) {
	return c.paths?.posts ?? "/article.json";
}
function categoriesPath(c) {
	return c.paths?.categories ?? "/categories.json";
}
function slugIndexPath(c) {
	return c.paths?.slugIndex ?? "/slug-index.json";
}
function postByUuidPath(c, uuid) {
	const fn = c.paths?.postByUuid;
	if (fn) return fn(uuid);
	return `/article/${encodeURIComponent(uuid)}/index.mdx`;
}
function postInfoByUuidPath(c, uuid) {
	const fn = c.paths?.postInfoByUuid;
	if (fn) return fn(uuid);
	return `/article/${encodeURIComponent(uuid)}/info.json`;
}
function parseThumbnail(value) {
	if (typeof value !== "object" || value === null) return null;
	const { imageId, blurhash64 } = value;
	if (typeof imageId !== "string" || !imageId) return null;
	return {
		imageId,
		blurhash64: typeof blurhash64 === "string" ? blurhash64 : ""
	};
}
/**
* Read the frontmatter `option:` map. YAML hands back whatever was written —
* dates, nulls, nested maps — so only the scalars an option field can hold
* survive; a map with nothing usable in it is dropped entirely.
*/
function parseOptionValues(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return;
	const values = {};
	for (const [key, raw] of Object.entries(value)) if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") values[key] = raw;
	return Object.keys(values).length > 0 ? values : void 0;
}
function toIsoDate(value) {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string" && value) {
		const t = Date.parse(value);
		if (!Number.isNaN(t)) return new Date(t).toISOString();
	}
	return null;
}
function parseImportedEdits(value) {
	if (!Array.isArray(value)) return void 0;
	const edits = [];
	for (const raw of value) {
		if (typeof raw !== "object" || raw === null) continue;
		const { date, player } = raw;
		const iso = toIsoDate(date);
		if (!iso || typeof player !== "string") continue;
		edits.push({
			date: iso,
			player
		});
	}
	return edits.length > 0 ? edits : void 0;
}
async function listPosts(deps, options) {
	const url = joinUrl(deps.config.cdnBaseUrl, postsPath(deps.config));
	const res = await deps.fetchImpl(url);
	if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
	const posts = await res.json();
	if (options?.sortBy) {
		const { sortBy, order = "desc" } = options;
		const dir = order === "asc" ? 1 : -1;
		posts.sort((a, b) => {
			if (sortBy === "title") return a.title.localeCompare(b.title) * dir;
			const av = a[sortBy] ?? "";
			const bv = b[sortBy] ?? "";
			if (av === bv) return 0;
			if (!av) return 1;
			if (!bv) return -1;
			return av.localeCompare(bv) * dir;
		});
	}
	return posts;
}
/**
* Load `index.mdx` (frontmatter + body) and the generated `info.json`
* (created/updated derived from imported + git history) for one post. A
* missing `info.json` — e.g. content served without the generate step — just
* leaves `created`/`updated` as `null`.
*/
/**
* Parse one `index.mdx` (frontmatter + body) into a post. Exposed so callers
* that read the file from somewhere other than the CDN — e.g. the repository
* itself, for an editor that must see not-yet-deployed changes — get the same
* shape as `posts.getByUuid`.
*/
function parsePostMarkdown(markdown, uuid, generated) {
	const { data, content } = matter(markdown);
	const option = parseOptionValues(data.option);
	return {
		title: data.title ?? "",
		slug: data.slug ?? "",
		uuid: data.uuid ?? uuid,
		description: data.description ?? "",
		category: data.category ?? "",
		thumbnail: parseThumbnail(data.thumbnail),
		created: toIsoDate(generated?.created),
		updated: toIsoDate(generated?.updated),
		modified: parseImportedEdits(data.modified),
		...option ? { option } : {},
		...data.draft === true ? { draft: true } : {},
		body: content
	};
}
async function getPostByUuid(deps, uuid) {
	const { config, fetchImpl } = deps;
	const [postRes, infoRes] = await Promise.all([fetchImpl(joinUrl(config.cdnBaseUrl, postByUuidPath(config, uuid))), fetchImpl(joinUrl(config.cdnBaseUrl, postInfoByUuidPath(config, uuid)))]);
	if (!postRes.ok) return null;
	const markdown = await postRes.text();
	let created = null;
	let updated = null;
	if (infoRes.ok) {
		const info = await infoRes.json();
		created = toIsoDate(info.created);
		updated = toIsoDate(info.updated);
	}
	return parsePostMarkdown(markdown, uuid, {
		created,
		updated
	});
}
/**
* Resolve a post by its human-facing slug via the generated
* `slug-index.json` (O(1)), falling back to a manifest scan when the index
* is missing. Returns `null` if no post has that slug.
*/
async function getPostBySlug(deps, slug) {
	const url = joinUrl(deps.config.cdnBaseUrl, slugIndexPath(deps.config));
	const res = await deps.fetchImpl(url);
	if (res.ok) {
		const uuid = (await res.json())[slug];
		return uuid ? getPostByUuid(deps, uuid) : null;
	}
	const match = (await listPosts(deps)).find((p) => p.slug === slug);
	if (!match) return null;
	return getPostByUuid(deps, match.uuid);
}
async function listCategories(deps) {
	const url = joinUrl(deps.config.cdnBaseUrl, categoriesPath(deps.config));
	const res = await deps.fetchImpl(url);
	if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
	const categories = await res.json();
	categories.sort((a, b) => a.slug.localeCompare(b.slug));
	return categories;
}
//#endregion
//#region src/api/files.ts
function decodeBase64(content) {
	const normalized = content.replace(/\n/g, "");
	if (typeof Buffer !== "undefined") return Buffer.from(normalized, "base64").toString("utf-8");
	const binary = atob(normalized);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}
/** Read one file from the repository. `null` when it does not exist. */
async function getFile(deps, path, ref) {
	const { octokit, owner, repo, branch } = deps;
	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner,
			repo,
			path,
			ref: ref ?? branch
		});
		if (Array.isArray(data) || data.type !== "file") return null;
		return {
			path: data.path,
			text: decodeBase64(data.content),
			sha: data.sha
		};
	} catch {
		return null;
	}
}
/**
* Read one file's raw bytes from the repository — for binary content
* (images) that {@link getFile}'s UTF-8 decoding would corrupt. `null` when
* it does not exist. The contents API only inlines files up to 1MB; larger
* blobs return `null`.
*/
async function getBinaryFile(deps, path, ref) {
	const { octokit, owner, repo, branch } = deps;
	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner,
			repo,
			path,
			ref: ref ?? branch
		});
		if (Array.isArray(data) || data.type !== "file" || !data.content) return null;
		const normalized = data.content.replace(/\n/g, "");
		if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(normalized, "base64"));
		const binary = atob(normalized);
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	} catch {
		return null;
	}
}
/** Whether a path exists on the branch (or at `ref`). */
async function fileExists(deps, path, ref) {
	const { octokit, owner, repo, branch } = deps;
	try {
		await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner,
			repo,
			path,
			ref: ref ?? branch
		});
		return true;
	} catch {
		return false;
	}
}
/** List one directory. Empty when the path is missing or is a file. */
async function listDirectory(deps, path, ref) {
	const { octokit, owner, repo, branch } = deps;
	try {
		const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
			owner,
			repo,
			path,
			ref: ref ?? branch
		});
		if (!Array.isArray(data)) return [];
		return data.filter((e) => e.type === "file" || e.type === "dir").map((e) => ({
			path: e.path,
			name: e.name,
			type: e.type,
			sha: e.sha,
			size: e.size ?? 0
		}));
	} catch {
		return [];
	}
}
/**
* Every file under a directory, recursively — the paths you need to hand to
* `commitFiles({ deletePaths })` to remove an article with its assets.
*/
async function listFilesRecursive(deps, path, ref) {
	const entries = await listDirectory(deps, path, ref);
	const paths = [];
	for (const entry of entries) if (entry.type === "file") paths.push(entry.path);
	else paths.push(...await listFilesRecursive(deps, entry.path, ref));
	return paths;
}
/**
* Every blob path in the repository at the branch tip, in one API call
* (`git/trees?recursive=1`) — unlike {@link listFilesRecursive}, which walks
* the contents API one directory at a time. Use this to enumerate articles.
*
* GitHub truncates the listing for very large trees (`truncated: true`); a
* warning is logged when that happens.
*/
async function listTreePaths(deps) {
	const { octokit, owner, repo, branch } = deps;
	const { data } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
		owner,
		repo,
		tree_sha: branch,
		recursive: "1"
	});
	if (data.truncated) console.warn("hagaki: git tree listing was truncated by GitHub — some paths are missing");
	return data.tree.filter((e) => e.type === "blob" && typeof e.path === "string").map((e) => e.path);
}
/** Commits that touched a path, newest first. */
async function listPathCommits(deps, path, options) {
	const { octokit, owner, repo } = deps;
	const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
		owner,
		repo,
		path,
		per_page: options?.perPage ?? 50
	});
	return data.map((commit) => ({
		sha: commit.sha,
		message: commit.commit.message,
		author: commit.commit.author?.name ?? "Unknown",
		date: commit.commit.author?.date ?? ""
	}));
}
/**
* Unified diff of one path between two commits. `null` when the path did not
* change between them (GitHub omits unchanged files from the comparison).
*/
async function getPathDiff(deps, path, base, head) {
	const { octokit, owner, repo } = deps;
	const { data } = await octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
		owner,
		repo,
		basehead: `${base}...${head}`
	});
	return (data.files?.find((f) => f.filename === path))?.patch ?? null;
}
//#endregion
//#region src/api/tree-commit.ts
function bytesToBase64(bytes) {
	if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}
async function toBase64(file) {
	const { content } = file;
	if (typeof content === "string") return file.encoding === "base64" ? content : bytesToBase64(new TextEncoder().encode(content));
	if (content instanceof Uint8Array) return bytesToBase64(content);
	if (content instanceof ArrayBuffer) return bytesToBase64(new Uint8Array(content));
	return bytesToBase64(new Uint8Array(await content.arrayBuffer()));
}
/**
* Commit multiple files as a single commit on the configured branch via the
* GitHub Git Data API (blobs → tree → commit → updateRef). Use this when you
* want atomicity (e.g. a markdown post + the images it references, or a post
* update + the images it no longer references).
*/
async function commitFiles(deps, input) {
	const { octokit, owner, repo, branch } = deps;
	const files = input.files ?? [];
	const deletePaths = dedupe(input.deletePaths ?? []);
	if (files.length === 0 && deletePaths.length === 0) throw new Error("commitFiles: at least one file or deletePath is required");
	const { data: refData } = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: `heads/${branch}`
	});
	const baseCommitSha = refData.object.sha;
	const { data: baseCommit } = await octokit.rest.git.getCommit({
		owner,
		repo,
		commit_sha: baseCommitSha
	});
	const baseTreeSha = baseCommit.tree.sha;
	const blobs = await Promise.all(files.map(async (file) => {
		const { data } = await octokit.rest.git.createBlob({
			owner,
			repo,
			content: await toBase64(file),
			encoding: "base64"
		});
		return {
			path: file.path,
			sha: data.sha
		};
	}));
	const deleteEntries = deletePaths.map((path) => ({
		path,
		mode: "100644",
		type: "blob",
		sha: null
	}));
	const { data: tree } = await octokit.rest.git.createTree({
		owner,
		repo,
		base_tree: baseTreeSha,
		tree: [...blobs.map((b) => ({
			path: b.path,
			mode: "100644",
			type: "blob",
			sha: b.sha
		})), ...deleteEntries]
	});
	const committer = input.committer;
	const { data: commit } = await octokit.rest.git.createCommit({
		owner,
		repo,
		message: input.commitMessage,
		tree: tree.sha,
		parents: [baseCommitSha],
		...committer && {
			committer,
			author: committer
		}
	});
	await octokit.rest.git.updateRef({
		owner,
		repo,
		ref: `heads/${branch}`,
		sha: commit.sha
	});
	return {
		commitSha: commit.sha,
		commitUrl: commit.html_url,
		paths: files.map((f) => f.path),
		deletedPaths: deletePaths
	};
}
function dedupe(values) {
	return Array.from(new Set(values));
}
//#endregion
//#region src/api/posts.ts
async function savePost(deps, form, options) {
	const { octokit, repo } = deps;
	if (!form.uuid) throw new Error("savePost: WikiPostDetail.uuid is required — generate one before saving");
	const filePath = `${repo.contentPath.replace(/\/$/, "")}/${form.uuid}/index.mdx`;
	const content = matter.stringify(form.body || "", {
		title: form.title,
		slug: form.slug,
		uuid: form.uuid,
		category: form.category,
		description: form.description,
		...form.thumbnail ? { thumbnail: form.thumbnail } : {},
		...form.option && Object.keys(form.option).length > 0 ? { option: form.option } : {},
		...form.modified && form.modified.length > 0 ? { modified: form.modified } : {},
		...form.draft ? { draft: true } : {}
	});
	const extraFiles = options?.files ?? [];
	const deletePaths = options?.deletePaths ?? [];
	if (extraFiles.length > 0 || deletePaths.length > 0) {
		const result = await commitFiles({
			octokit,
			owner: repo.owner,
			repo: repo.repo,
			branch: repo.branch
		}, {
			files: [...extraFiles, {
				path: filePath,
				content
			}],
			deletePaths,
			committer: options?.committer,
			commitMessage: options?.commitMessage ?? `📝 Update post: ${form.slug}`
		});
		return {
			commitSha: result.commitSha,
			commitUrl: result.commitUrl,
			path: filePath
		};
	}
	const contentEncoded = bytesToBase64(new TextEncoder().encode(content));
	let fileSha;
	try {
		const { data: fileData } = await octokit.rest.repos.getContent({
			owner: repo.owner,
			repo: repo.repo,
			path: filePath,
			ref: repo.branch
		});
		if (!Array.isArray(fileData) && "sha" in fileData && fileData.sha) fileSha = fileData.sha;
	} catch (e) {
		if (typeof e === "object" && e !== null && "status" in e && e.status !== 404) throw e;
	}
	const committer = options?.committer;
	const { data: commitData } = await octokit.rest.repos.createOrUpdateFileContents({
		owner: repo.owner,
		repo: repo.repo,
		path: filePath,
		message: options?.commitMessage ?? `📝 Update post: ${form.slug}`,
		content: contentEncoded,
		branch: repo.branch,
		sha: fileSha,
		...committer && {
			committer,
			author: committer
		}
	});
	return {
		commitSha: commitData.commit.sha ?? "",
		commitUrl: commitData.commit.html_url ?? "",
		path: filePath
	};
}
//#endregion
//#region src/api/client.ts
async function resolveAuth(auth) {
	return typeof auth === "function" ? await auth() : auth;
}
function createHagakiClient(config) {
	const branch = config.github.branch ?? "main";
	const contentPath = config.github.contentPath ?? "content/article";
	const fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
	async function getOctokit() {
		const token = await resolveAuth(config.github.auth);
		return new Octokit({ auth: token });
	}
	/** Repository path of a post's body. */
	function postPath(uuid) {
		return `${contentPath}/${uuid}/index.mdx`;
	}
	async function filesDeps() {
		return {
			octokit: await getOctokit(),
			owner: config.github.owner,
			repo: config.github.repo,
			branch
		};
	}
	function requireContent() {
		if (!config.content) throw new Error("hagaki: `content` config is required for content fetching");
		return config.content;
	}
	return {
		posts: {
			async list(options) {
				return listPosts({
					config: requireContent(),
					fetchImpl
				}, options);
			},
			async getBySlug(slug) {
				return getPostBySlug({
					config: requireContent(),
					fetchImpl
				}, slug);
			},
			async getByUuid(uuid) {
				return getPostByUuid({
					config: requireContent(),
					fetchImpl
				}, uuid);
			},
			async getFromRepo(uuid, options) {
				const file = await getFile(await filesDeps(), postPath(uuid), options?.ref);
				return file ? parsePostMarkdown(file.text, uuid) : null;
			},
			async existsInRepo(uuid) {
				return fileExists(await filesDeps(), postPath(uuid));
			},
			async listUuidsInRepo() {
				const prefix = `${contentPath}/`;
				const paths = await listTreePaths(await filesDeps());
				const uuids = [];
				for (const p of paths) {
					if (!p.startsWith(prefix)) continue;
					const [dir, file, ...deeper] = p.slice(prefix.length).split("/");
					if (dir && file === "index.mdx" && deeper.length === 0) uuids.push(dir);
				}
				return uuids;
			},
			async repoPaths(uuid) {
				return listFilesRecursive(await filesDeps(), `${contentPath}/${uuid}`);
			},
			async history(uuid, options) {
				return listPathCommits(await filesDeps(), postPath(uuid), options);
			},
			async diff(uuid, base, head) {
				return getPathDiff(await filesDeps(), postPath(uuid), base, head);
			},
			async save(post, options) {
				return savePost({
					octokit: await getOctokit(),
					repo: {
						owner: config.github.owner,
						repo: config.github.repo,
						branch,
						contentPath
					}
				}, post, options);
			}
		},
		categories: { async list() {
			return listCategories({
				config: requireContent(),
				fetchImpl
			});
		} },
		files: {
			async get(path, ref) {
				return getFile(await filesDeps(), path, ref);
			},
			async getBinary(path, ref) {
				return getBinaryFile(await filesDeps(), path, ref);
			},
			async exists(path, ref) {
				return fileExists(await filesDeps(), path, ref);
			},
			async list(path, ref) {
				return listDirectory(await filesDeps(), path, ref);
			},
			async listRecursive(path, ref) {
				return listFilesRecursive(await filesDeps(), path, ref);
			}
		},
		commits: {
			async getWithChecks(sha) {
				return getCommitWithChecks({
					octokit: await getOctokit(),
					owner: config.github.owner,
					repo: config.github.repo
				}, sha);
			},
			async commitFiles(input) {
				return commitFiles({
					octokit: await getOctokit(),
					owner: config.github.owner,
					repo: config.github.repo,
					branch
				}, input);
			}
		}
	};
}
//#endregion
//#region src/api/slug.ts
function toUrlSlug(str) {
	return encodeURIComponent(str.normalize("NFKC").replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248)).replace(/\s+/g, "-").replace(/[\u3000]/g, "-").replace(/--+/g, "-").replace(/^-+|-+$/g, "").toLowerCase());
}
//#endregion
//#region src/api/url.ts
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
/**
* Resolve a markdown image / content URL against the configured CDN base.
* Already-absolute URLs (`http://`, `https://`, `data:`, etc.) are returned
* unchanged. An empty `cdnBaseUrl` is treated as a no-op so this helper can
* be called unconditionally.
*/
function resolveCdnUrl(src, cdnBaseUrl) {
	if (ABSOLUTE_URL_PATTERN.test(src)) return src;
	if (!cdnBaseUrl) return src;
	return `${cdnBaseUrl.replace(/\/$/, "")}${src.startsWith("/") ? src : `/${src}`}`;
}
//#endregion
export { createHagakiClient, makeCommitter, resolveCdnUrl, toUrlSlug };

//# sourceMappingURL=index.js.map