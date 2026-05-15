"use client";
import type { ReactNode } from "react";

export interface HagakiEditorToolbarProps {
    children?: ReactNode;
    className?: string;
}

/**
 * Slot marker. `HagakiEditorRoot` scans for this element type and forwards its
 * children into MDXEditor's `toolbarPlugin({ toolbarContents })`. Children must
 * be MDXEditor toolbar components (re-exported as `HagakiEditor.UndoRedo` etc.)
 * because they rely on MDXEditor's gurx context.
 */
export function Toolbar(_props: HagakiEditorToolbarProps): null {
    return null;
}
