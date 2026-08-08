"use client";

import { realmPlugin } from "@mdxeditor/editor";
import { Cell } from "@mdxeditor/gurx";

/**
 * Upload handler contract: receives the picked file, returns the image id to
 * store in the inserted `::img` directive. Typically that's a session-local
 * `pending:<uuid>` placeholder (see `hagaki/pending-images`) which the save
 * flow later rewrites to the final `<uuid>.avif` file name.
 */
export type ImageUploadHandler = (file: File) => Promise<string>;

export const imageUploadHandler$ = Cell<ImageUploadHandler | null>(null);

export interface HagakiImageUploadPluginParams {
    onImageUpload?: ImageUploadHandler | null;
}

/**
 * Registers the upload handler used by `InsertImage.FileButton`. Unlike
 * MDXEditor's `imagePlugin`, uploads insert a `::img` leaf directive rather
 * than a markdown image node.
 */
export const hagakiImageUploadPlugin =
    realmPlugin<HagakiImageUploadPluginParams>({
        init(realm, params) {
            realm.pub(imageUploadHandler$, params?.onImageUpload ?? null);
        },
        update(realm, params) {
            realm.pub(imageUploadHandler$, params?.onImageUpload ?? null);
        },
    });
