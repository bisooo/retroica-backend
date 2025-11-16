// src/workflows/update-currency-prices.ts
import { 
  createWorkflow, 
  WorkflowResponse,
  createStep,
  StepResponse,
  transform
} from "@medusajs/framework/workflows-sdk"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

export type WorkflowInput = {
  baseCurrency: string
  conversionRates: Record<string, number>
}

const getVariantsWithPricesStep = createStep(
  "get-variants-with-prices",
  async (input: WorkflowInput, { container }) => {
    const query = container.resolve("query")
        
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "price_set.*",
        "price_set.prices.*",
      ],
    })
        
    return new StepResponse(variants)
  }
)

export const updateCurrencyPricesWorkflow = createWorkflow(
  "update-currency-prices",
  function (input: WorkflowInput) {
    const variants = getVariantsWithPricesStep(input)
    
    const variantUpdates = transform(
      { variants, input },
      (data): Array<{
        id: string
        prices: Array<{
          currency_code: string
          amount: number
        }>
      }> => {
        const updates = data.variants
          .map((variant: any) => {
            // Find base currency price - convert to lowercase for comparison
            const basePrice = variant.price_set?.prices?.find(
              (p: any) => p.currency_code === data.input.baseCurrency.toLowerCase()
            )
            
            if (!basePrice) {
              return null
            }
            
            // Calculate prices for other currencies
            const newPrices = Object.entries(data.input.conversionRates).map(
              ([currency, rate]) => ({
                currency_code: currency.toLowerCase(),
                amount: Math.round(basePrice.amount * rate),
              })
            )
            
            // Include the original base currency price along with the new prices
            const prices = [
              {
                currency_code: data.input.baseCurrency.toLowerCase(),
                amount: basePrice.amount,
              },
              ...newPrices
            ]
            
            return {
              id: variant.id,
              prices,
            }
          })
          .filter((update): update is NonNullable<typeof update> => update !== null)
        
        return updates
      }
    )
    
    const updatedVariants = updateProductVariantsWorkflow.runAsStep({
      input: {
        product_variants: variantUpdates,
      }
    })
    
    const summary = transform(
      { updatedVariants },
      (data) => {
        return {
          message: "Successfully updated currency prices",
          variantsUpdated: data.updatedVariants.length,
          variants: data.updatedVariants,
        }
      }
    )
    
    return new WorkflowResponse(summary)
  }
)