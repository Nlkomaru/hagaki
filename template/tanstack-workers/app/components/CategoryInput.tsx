import type { Category } from "hagaki";
import { useId } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export interface CategoryInputProps {
    value: string;
    categories: Category[];
    onChange: (slug: string) => void;
}

/**
 * Category picker backed by a native `<datalist>`: existing categories show
 * up as suggestions, but a new slug can still be typed in (hybrid). The
 * stored value is the category *slug* to match `categories/<slug>.json`.
 */
export function CategoryInput({
    value,
    categories,
    onChange,
}: CategoryInputProps) {
    const listId = useId();
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
                id="category"
                list={listId}
                value={value}
                placeholder="general"
                onChange={(event) => onChange(event.target.value)}
            />
            <datalist id={listId}>
                {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                        {category.title}
                    </option>
                ))}
            </datalist>
        </div>
    );
}
