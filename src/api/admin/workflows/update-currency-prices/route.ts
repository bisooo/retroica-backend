// src/api/admin/workflows/update-currency-prices/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateCurrencyPricesWorkflow, WorkflowInput } from "../../../../workflows/update-currency-prices"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as WorkflowInput
  console.log("API received request:", body)

  const { result, errors } = await updateCurrencyPricesWorkflow.run({
    input: body,
    container: req.scope,
    throwOnError: false,
  })

  if (errors?.length) {
    console.error("Workflow errors:", errors)
    return res.status(500).json({ errors })
  }

  console.log("Workflow result:", result)
  return res.json(result)
}

