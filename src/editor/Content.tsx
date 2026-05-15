"use client";

export interface HagakiEditorContentProps {
    className?: string;
}

/**
 * Slot marker. `HagakiEditorRoot` reads the `className` prop and passes it as
 * MDXEditor's `contentEditableClassName`. The component renders nothing on its
 * own — MDXEditor renders the editable surface.
 */
export function Content(_props: HagakiEditorContentProps): null {
    return null;
}
