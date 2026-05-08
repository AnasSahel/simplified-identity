/**
 * Internal "recipe" tree shape used by the visual builder.
 *
 * A `Recipe` is just a normalised view of the SailPoint transform JSON:
 *   - `type` (e.g. "concat") — what to do
 *   - `attributes` — form fields for that type, where any attribute that
 *     accepts a nested transform stores it as a `RecipeValue` (string |
 *     number | boolean | nested Recipe | array thereof).
 *
 * The two helpers `recipeToJson` and `jsonToRecipe` keep the SailPoint
 * payload (the source of truth at save time) in sync with the visual tree.
 */

export type RecipeValue =
  | string
  | number
  | boolean
  | null
  | Recipe
  | RecipeValue[]
  | { [k: string]: RecipeValue };

export type Recipe = {
  type: string;
  attributes: Record<string, RecipeValue>;
};

export type RootRecipe = Recipe & {
  /** Persistent on the root only — `attributes` of nested children don't carry the name. */
  name: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function looksLikeTransform(v: unknown): v is { type: string; attributes?: unknown } {
  return isRecord(v) && typeof v.type === "string";
}

// ── jsonToRecipe ──────────────────────────────────────────────────────

export function jsonToRecipe(parsed: unknown): RootRecipe | null {
  if (!isRecord(parsed)) return null;
  if (typeof parsed.type !== "string" || typeof parsed.name !== "string") {
    return null;
  }
  return {
    name: parsed.name,
    type: parsed.type,
    attributes: normalizeAttributes(parsed.attributes),
  };
}

function normalizeAttributes(value: unknown): Record<string, RecipeValue> {
  if (!isRecord(value)) return {};
  const out: Record<string, RecipeValue> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = normalizeValue(v);
  }
  return out;
}

function normalizeValue(value: unknown): RecipeValue {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (looksLikeTransform(value)) {
    return {
      type: value.type,
      attributes: normalizeAttributes(value.attributes),
    };
  }
  if (isRecord(value)) {
    const out: Record<string, RecipeValue> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeValue(v);
    return out;
  }
  return null;
}

// ── recipeToJson ──────────────────────────────────────────────────────

export function recipeToJson(recipe: RootRecipe): {
  name: string;
  type: string;
  attributes: Record<string, unknown>;
} {
  return {
    name: recipe.name,
    type: recipe.type,
    attributes: serialiseAttributes(recipe.attributes),
  };
}

function serialiseAttributes(
  attrs: Record<string, RecipeValue>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) out[k] = serialiseValue(v);
  return out;
}

function serialiseValue(value: RecipeValue): unknown {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(serialiseValue);
  if (isNestedRecipe(value)) {
    return {
      type: value.type,
      attributes: serialiseAttributes(value.attributes),
    };
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialiseValue(v as RecipeValue);
    }
    return out;
  }
  return null;
}

function isNestedRecipe(value: RecipeValue): value is Recipe {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "type" in value &&
    typeof (value as Recipe).type === "string" &&
    "attributes" in value &&
    typeof (value as Recipe).attributes === "object"
  );
}

// ── path-based mutation helpers ───────────────────────────────────────

/**
 * Path-addressing for nested edits. A path is an array of segments where
 * each segment is either a string (attribute key on a Recipe) or a number
 * (index into an array attribute, e.g. concat.values[0]).
 *
 *   updateAt(root, ["attributes", "values", 0, "type"], "upper")
 *
 * Returns a new root with the change applied immutably (shallow-cloned
 * along the path). If the path doesn't resolve, the original root is
 * returned unchanged.
 */
export function updateAt<T>(root: T, path: ReadonlyArray<string | number>, value: unknown): T {
  if (path.length === 0) return value as T;
  return setIn(root, path, value) as T;
}

function setIn(node: unknown, path: ReadonlyArray<string | number>, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    if (!Array.isArray(node)) return node;
    const copy = [...node];
    copy[head] = setIn(copy[head], rest, value);
    return copy;
  }
  if (!isRecord(node)) return node;
  const copy: Record<string, unknown> = { ...node };
  copy[head] = setIn(copy[head], rest, value);
  return copy;
}

/** Read a value at a path. */
export function getAt(root: unknown, path: ReadonlyArray<string | number>): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (!isRecord(cur)) return undefined;
      cur = cur[seg];
    }
  }
  return cur;
}
