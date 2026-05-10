// resources/js/lib/plan-utils.ts

/**
 * Removes version tags (v1, v2.1, planner-v3, plan-json-v4, etc.) and
 * normalizes whitespace from plan display names.
 *
 * Internal plan names may include version identifiers like "AI Diet Plan v14".
 * This utility returns a clean display name such as "AI Diet Plan".
 */
export function cleanPlanName(name?: string | null): string | null {
    if (!name) return null;

    return (
        name
            // Remove standalone version numbers: v1, v2.3, planner-v4, etc.
            .replace(/\b(?:planner-)?v\d+(?:\.\d+)?\b/gi, '')
            // Remove schema tags: plan-json-v4
            .replace(/\bplan-json-v\d+\b/gi, '')
            // Collapse multiple spaces
            .replace(/\s{2,}/g, ' ')
            // Remove trailing separators like "-", ":", "/"
            .replace(/\s+[-:/]\s*$/g, '')
            .trim() || null
    );
}
