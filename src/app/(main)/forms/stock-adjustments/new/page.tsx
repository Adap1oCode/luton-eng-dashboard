import { FormShell, FormIsland } from "@/components/forms/shell";
import { stockAdjustmentCreateConfig } from "./form.config";
import { buildDefaults } from "@/lib/forms/schema";

export default async function NewStockAdjustmentPage() {
  const defaults = buildDefaults(stockAdjustmentCreateConfig as any);
  const formId = `form-${stockAdjustmentCreateConfig.key}`;

  // 🔒 Remove any functions from the config before passing to a Client Component
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } =
    stockAdjustmentCreateConfig as any;

  return (
    <FormShell
      title={stockAdjustmentCreateConfig.title}
      headerTitle={stockAdjustmentCreateConfig.title}
      headerDescription={stockAdjustmentCreateConfig.subtitle}
      actions={{
        secondaryLeft: (
          <a
            href={`/forms/${stockAdjustmentCreateConfig.key}`}
            className="text-sm underline underline-offset-4"
          >
            Cancel
          </a>
        ),
        primary: (
          <button
            type="submit"
            form={formId}
            className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {stockAdjustmentCreateConfig.submitLabel ?? "Save"}
          </button>
        ),
      }}
    >
      <FormIsland
        // ⬇️ pass only the serializable config
        config={clientConfig}
        defaults={defaults}
        options={{}}
        formId={formId}
      />
    </FormShell>
  );
}
