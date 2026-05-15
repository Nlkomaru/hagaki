"use client";
import { HagakiEditor } from "hagaki/react";
import { ImagePlus } from "lucide-react";

export interface EditorProps {
    markdown: string;
    onChange: (markdown: string) => void;
    onImageUpload?: (file: File) => Promise<string>;
    onImagePreview?: (src: string) => Promise<string>;
}

/**
 * Override the labels rendered inside MDXEditor's built-in dialogs / tooltips.
 * Keys match MDXEditor's i18n keys (search `useTranslation` calls inside
 * @mdxeditor/editor for the full list). Unknown keys fall back to the upstream
 * English defaults.
 */
const i18n: Record<string, string> = {
    // Image dialog
    "uploadImage.dialogTitle": "画像をアップロード",
    "uploadImage.uploadInstructions": "デバイスから画像をアップロード:",
    "uploadImage.addViaUrlInstructions": "もしくは URL から追加:",
    "uploadImage.addViaUrlInstructionsNoUpload": "URL から画像を追加:",
    "uploadImage.autoCompletePlaceholder": "画像の URL を入力 / 選択",
    "uploadImage.alt": "代替テキスト (alt):",
    "uploadImage.title": "タイトル:",
    "uploadImage.width": "幅:",
    "uploadImage.height": "高さ:",
    // Common dialog controls
    "dialogControls.save": "保存",
    "dialogControls.cancel": "キャンセル",
    // Toolbar tooltips
    "toolbar.image": "画像を挿入",
    "toolbar.bold": "太字",
    "toolbar.italic": "斜体",
    "toolbar.underline": "下線",
    "toolbar.undo": "元に戻す {{shortcut}}",
    "toolbar.redo": "やり直す {{shortcut}}",
    "toolbar.link": "リンクを作成",
    "toolbar.table": "テーブルを挿入",
    "toolbar.thematicBreak": "区切り線",
    "toolbar.codeBlock": "コードブロック",
    "toolbar.bulletedList": "箇条書きリスト",
    "toolbar.numberedList": "番号付きリスト",
    "toolbar.checkList": "チェックリスト",
};

/**
 * Project-styled wrapper around hagaki's composite `<HagakiEditor>`. Each slot
 * receives its own Tailwind classes; tweak them here to restyle without
 * touching the route.
 */
export function Editor(props: EditorProps) {
    return (
        <div>
            <HagakiEditor
                markdown={props.markdown}
                onChange={props.onChange}
                onImageUpload={props.onImageUpload}
                onImagePreview={props.onImagePreview}
                i18n={i18n}
                className="bg-card text-foreground [&_[role=dialog]]:bg-card [&_[role=dialog]]:border [&_[role=dialog]]:border-border [&_[role=dialog]]:rounded-lg [&_[role=dialog]]:p-6 [&_[role=dialog]]:text-foreground [&_[role=dialog]_label]:text-sm [&_[role=dialog]_label]:font-medium [&_[role=dialog]_label]:text-muted-foreground [&_[role=dialog]_input[type=text]]:rounded-md [&_[role=dialog]_input[type=text]]:border [&_[role=dialog]_input[type=text]]:border-input [&_[role=dialog]_input[type=text]]:bg-background [&_[role=dialog]_input[type=text]]:px-3 [&_[role=dialog]_input[type=text]]:py-1.5 [&_[role=dialog]_input[type=text]]:text-sm"
            >
                <HagakiEditor.Toolbar className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1 [&_button]:size-8 [&_button]:rounded [&_button]:text-foreground [&_button[data-state=on]]:bg-accent [&_button:hover]:bg-accent">
                    <HagakiEditor.UndoRedo />
                    <HagakiEditor.Separator />
                    <HagakiEditor.BlockTypeSelect />
                    <HagakiEditor.BoldItalicUnderlineToggles />
                    {/*<HagakiEditor.ListsToggle />*/}
                    {/*<HagakiEditor.Separator />*/}
                    {/*<HagakiEditor.CreateLink />*/}
                    <HagakiEditor.InsertImage.FileButton
                        className="inline-flex items-center justify-center gap-1.5 size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none"
                        title="画像をアップロード"
                    >
                        <ImagePlus className="size-4" />
                    </HagakiEditor.InsertImage.FileButton>
                    {/*<HagakiEditor.InsertTable />*/}
                    <HagakiEditor.InsertThematicBreak />
                    {/*<HagakiEditor.InsertCodeBlock />*/}
                </HagakiEditor.Toolbar>
                <HagakiEditor.Content className="prose prose-neutral max-w-none px-4 py-3 min-h-[400px] focus:outline-none" />
            </HagakiEditor>
        </div>
    );
}
