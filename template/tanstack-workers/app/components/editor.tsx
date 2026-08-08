"use client";
import { HagakiEditor } from "hagaki/editor";
import { ImagePlus } from "lucide-react";
import { editorI18n } from "./editor-i18n";

export interface EditorProps {
    markdown: string;
    onChange: (markdown: string) => void;
    /** 画像アップロード。挿入する ::img directive の id を返す。 */
    onImageUpload?: (file: File) => Promise<string>;
}

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
                i18n={editorI18n}
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
