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
    // Get cart items from context
    const items = context.items || []
    
    // Determine region (from shipping address country code)
    const region = context.shipping_address?.country_code?.toUpperCase() || 'US'
    
    // Find the largest shipping size from cart items
    let largestSize = 'small'
    let totalWeight = 0
    
    for (const item of items) {
      // Access product metadata for shipping_size
      const shippingSize = item.variant?.product?.metadata?.shipping_size || 'small'
      
      // Determine largest size
      if (shippingSize === 'large') {
        largestSize = 'large'
      } else if (shippingSize === 'medium' && largestSize !== 'large') {
        largestSize = 'medium'
      }
      
      // Calculate total weight
      const weight = item.variant?.product?.weight || 0
      totalWeight += weight * item.quantity
    }
    
    // Sanity check: verify weight doesn't exceed category limit
    if (totalWeight > WEIGHT_LIMITS.medium && largestSize === 'small') {
      largestSize = 'medium'
    }
    if (totalWeight > WEIGHT_LIMITS.large && largestSize === 'medium') {
      largestSize = 'large'
    }
    
    // Get base price for the largest size
    const pricingRegion = COUNTRIES.find(x => x.code == region.toLowerCase())?.region || "UNITED-STATES"
    const regionPricing = PRICING_MATRIX[pricingRegion]
    let finalPrice = regionPricing[largestSize]
    
    // Add additional price if more than one product
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