import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
} from "@medusajs/framework/types"
import { COUNTRIES } from "./countries"
import { PRICING_MATRIX } from "./prices"

const WEIGHT_LIMITS = {
  small: 1000,  // 1kg in grams
  medium: 2000, // 2kg in grams
  large: 5000,  // 5kg in grams
}

class MyFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "my-fulfillment"

  constructor() {
    super()
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "standard-shipping",
      },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<any> {
    return data
  }

  async validateOption(data: Record<string, any>): Promise<boolean> {
    return true
  }

  async canCalculate(data: any): Promise<boolean> {
    return true
  }

async calculatePrice(
  optionData: Record<string, unknown>,
  data: Record<string, unknown>,
  context: any
): Promise<CalculatedShippingOptionPrice> {
  // fetch the region + largest size + total weight
  const region = context.shipping_address?.country_code?.toUpperCase() || "US"
  let largestSize = (data.shipping_size as "small" | "medium" | "large") || "small"
  let totalWeight = (data.weight as number) || 0
  
  // sanity check the total weight
  if (totalWeight > WEIGHT_LIMITS.small && largestSize === "small") {
    largestSize = "medium"
  }
  if (totalWeight > WEIGHT_LIMITS.medium && largestSize === "medium") {
    largestSize = "large"
  }

  // base the price on the largest item per region
  const pricingRegion = COUNTRIES.find((x) => x.code === region.toLowerCase())?.region || "UNITED-STATES"
  const regionPricing = PRICING_MATRIX[pricingRegion]
  let finalPrice = regionPricing[largestSize]

  // add an additional price for multiple items
  const items = context.items || []
  if (items.length > 1) {
    finalPrice += regionPricing.additional
  }

  return {
    calculated_amount: finalPrice,
    is_calculated_price_tax_inclusive: false,
  }
}

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    return {
      data,
      labels: [],
    }
  }

  async cancelFulfillment(): Promise<any> {
    return {}
  }

  async createReturnFulfillment(): Promise<any> {
    return {}
  }
}

export default MyFulfillmentProviderService