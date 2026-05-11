"use client";

import * as React from "react";

import {
  getAt,
  updateAt,
  type RootRecipe,
} from "@/lib/sailpoint/transforms/recipe";

import { ChainView } from "./recipe-node";

export function RecipeView({
  recipe,
  onRecipeChange,
  tenantTransforms,
  tenantSources,
}: {
  recipe: RootRecipe;
  onRecipeChange: (next: RootRecipe) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
}) {
  // Path-based mutator. Top-level keys are `name`, `type`, `attributes`.
  // An empty path replaces the whole node — used by the type picker on
  // the root, and by "Add step above" which wraps the current root.
  const onChange = React.useCallback(
    (path: ReadonlyArray<string | number>, value: unknown) => {
      if (path.length === 0) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          "type" in value &&
          "attributes" in value
        ) {
          const next = value as {
            type: string;
            attributes: Record<string, unknown>;
          };
          onRecipeChange({
            name: recipe.name,
            type: next.type,
            attributes: next.attributes as RootRecipe["attributes"],
          });
        }
        return;
      }
      onRecipeChange(updateAt(recipe, path, value) as RootRecipe);
    },
    [recipe, onRecipeChange],
  );

  return (
    <div>
      <ChainView
        node={{ type: recipe.type, attributes: recipe.attributes }}
        path={[]}
        onChange={onChange}
        isRoot
        label="OUTPUT"
        tenantTransforms={tenantTransforms}
        tenantSources={tenantSources}
      />
    </div>
  );
}

// Re-export so callers can read into the recipe without importing both files
export { getAt };
