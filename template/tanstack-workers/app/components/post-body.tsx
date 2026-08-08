import {
    blurhashToBase64,
    isImageComponentNode,
    type MdxJsxAttributeLike,
    parseImageComponentAttributes,
} from "hagaki/markdown";
import { HagakiImageConfig, Image } from "hagaki/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { Options as RehypeReactOptions } from "rehype-react";
import rehypeReact from "rehype-react";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { committedImageUrl } from "../lib/post-editor-images";

/**
 * 記事本文の markdown (MDX) → React レンダリング。
 *
 * remark-mdx で `<Image imageId=… blurHash64=… width=… height=… alt=… />` を
 * 拾い、hagaki/react の `<Image>`(blurhash プレースホルダ + フェードイン
 * 内蔵)にマップする。HTML 文字列 + dangerouslySetInnerHTML の経路は廃止
 * 済み。Workers では eval が使えないため @mdx-js/mdx の evaluate ではなく
 * AST 変換(ホワイトリスト方式)で描画する。
 *
 * - `:::note` 等の admonition container は簡易 callout にマップ
 * - 未知の directive・未知の JSX/式ノードはソース位置スライスでリテラル
 *   復元する(remark-directive は `参照:foo` のような本文中のコロン表記を
 *   textDirective として食ってしまうため)
 */

interface MdNode {
    type: string;
    name?: string | null;
    children?: MdNode[];
    value?: string;
    attributes?: Record<string, string | null | undefined> | unknown[];
    position?: { start?: { offset?: number }; end?: { offset?: number } };
    data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const DIRECTIVE_TYPES = new Set([
    "textDirective",
    "leafDirective",
    "containerDirective",
]);

// remark-mdx が生む JSX / 式 / ESM ノード。<Image /> 以外はリテラル復元。
const MDX_TYPES = new Set([
    "mdxJsxFlowElement",
    "mdxJsxTextElement",
    "mdxFlowExpression",
    "mdxTextExpression",
    "mdxjsEsm",
]);

const ADMONITION_KINDS = new Set(["note", "tip", "danger", "info", "caution"]);

function remarkHagakiDirectives() {
    return (tree: MdNode, file: { toString(): string }) => {
        const source = String(file);
        tree.children = tree.children?.map((child) => visit(child, source));
    };
}

function visit(node: MdNode, source: string): MdNode {
    if (DIRECTIVE_TYPES.has(node.type) || MDX_TYPES.has(node.type)) {
        const mapped = mapSpecialNode(node, source);
        // リテラル復元されたテキストノード — 子は残っていない
        if (mapped !== node) return mapped;
    }
    if (node.children) {
        node.children = node.children.map((child) => visit(child, source));
    }
    return node;
}

function mapSpecialNode(node: MdNode, source: string): MdNode {
    if (isImageComponentNode(node)) {
        // imageId の uuid 検証と width/height の正規化は hagaki の
        // AST 用パーサに任せる。
        const attrs = parseImageComponentAttributes(
            node.attributes as MdxJsxAttributeLike[] | undefined,
        );
        if (!attrs) return { type: "text", value: "" };
        node.data = {
            hName: "hagaki-img",
            hProperties: {
                imageid: attrs.id,
                // hast 属性は文字列運搬 — 保存形の base64 に揃える。
                blurhash64: attrs.blurhash
                    ? blurhashToBase64(attrs.blurhash)
                    : undefined,
                w: attrs.width ?? undefined,
                h: attrs.height ?? undefined,
                alt: attrs.alt ?? undefined,
            },
        };
        node.children = [];
        return node;
    }
    if (
        node.type === "containerDirective" &&
        node.name &&
        ADMONITION_KINDS.has(node.name)
    ) {
        node.data = {
            hName: "hagaki-admonition",
            hProperties: { kind: node.name },
        };
        return node;
    }
    // 未知 directive / 未知 JSX / 式ノード: 元ソースをそのまま本文
    // テキストとして復元する。
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    const literal =
        start != null && end != null
            ? source.slice(start, end)
            : (node.value ?? "");
    return { type: "text", value: literal };
}

function toDimension(value: unknown): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function HagakiImg(props: {
    imageid?: string;
    blurhash64?: string;
    w?: string | number;
    h?: string | number;
    alt?: string;
}) {
    return (
        <Image
            imageId={props.imageid ?? ""}
            blurHash64={props.blurhash64}
            width={toDimension(props.w)}
            height={toDimension(props.h)}
            alt={props.alt ?? ""}
        />
    );
}

const ADMONITION_STYLES: Record<string, string> = {
    note: "border-l-sky-400 bg-sky-50/60",
    tip: "border-l-emerald-400 bg-emerald-50/60",
    info: "border-l-sky-400 bg-sky-50/60",
    caution: "border-l-amber-400 bg-amber-50/60",
    danger: "border-l-red-400 bg-red-50/60",
};

function HagakiAdmonition(props: { kind?: string; children?: ReactNode }) {
    const kind = props.kind ?? "note";
    return (
        <aside
            data-admonition={kind}
            className={`my-4 rounded-md border border-l-4 px-4 py-2 text-sm ${
                ADMONITION_STYLES[kind] ?? ADMONITION_STYLES.note
            }`}
        >
            {props.children}
        </aside>
    );
}

const components = {
    "hagaki-img": HagakiImg,
    "hagaki-admonition": HagakiAdmonition,
} as unknown as RehypeReactOptions["components"];

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkDirective)
    .use(remarkHagakiDirectives)
    .use(remarkRehype)
    .use(rehypeReact, { Fragment, jsx, jsxs, components });

// MDX は生の `<` や `{` を構文エラーにする。エディタ経由の本文は常に
// エスケープ済みだが、手書き・移行前の本文でページ全体が落ちないよう、
// パース失敗時は MDX 拡張なしの markdown として描画する。
const plainProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkHagakiDirectives)
    .use(remarkRehype)
    .use(rehypeReact, { Fragment, jsx, jsxs, components });

function renderMarkdown(markdown: string): ReactNode {
    try {
        return processor.processSync(markdown).result;
    } catch {
        return plainProcessor.processSync(markdown).result;
    }
}

export interface PostBodyProps {
    markdown: string;
    /** 記事 uuid — `<Image>` の URL 解決(articleId)に使う。 */
    articleId: string;
    cdnBaseUrl: string;
    className?: string;
}

export function PostBody(props: PostBodyProps) {
    const { markdown, articleId, cdnBaseUrl, className } = props;
    // <Image /> の imageId (uuid) → コミット済み CDN URL(`<id>.avif`)。
    const urlFor = useMemo(
        () =>
            ({
                articleId: id,
                imageId,
            }: {
                articleId: string;
                imageId: string;
            }) =>
                committedImageUrl(imageId, id, cdnBaseUrl),
        [cdnBaseUrl],
    );
    const content = useMemo(() => renderMarkdown(markdown), [markdown]);
    return (
        <div className={className}>
            <HagakiImageConfig articleId={articleId} urlFor={urlFor}>
                {content}
            </HagakiImageConfig>
        </div>
    );
}
