import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, toast, Input, Label } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type UpdateCurrencyPricesResponse = { message: string; result: any }

const UpdateCurrencyPricesPage = () => {
  const [rates, setRates] = useState({
    AUD: "1.78",
    CAD: "1.63",
    CZK: "24.16",
    GBP: "0.88",
    USD: "1.16",
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
        return await sdk.client.fetch<UpdateCurrencyPricesResponse>("/admin/workflows/update-currency-prices", {
        method: "POST",
        body: {
            baseCurrency: "EUR",
            conversionRates: {
                AUD: parseFloat(rates.AUD),
                CAD: parseFloat(rates.CAD),
                CZK: parseFloat(rates.CZK),
                GBP: parseFloat(rates.GBP),
                USD: parseFloat(rates.USD),
                },
        },
        })
    },
    onSuccess: (data) => {
      toast.success("Success", {
        description: data.message,
      })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error("Failed to update currency prices", {
        description: err.message,
      })
    },
  })

  return (
    <Container className="p-6">
      <div className="space-y-6">
        <div>
          <Heading level="h1">Update Currency Prices</Heading>
          <p className="text-ui-fg-subtle mt-2">
            Convert all product prices from EUR to other currencies using exchange rates
          </p>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="aud-rate">EUR to AUD Rate</Label>
            <Input
              id="aud-rate"
              type="number"
              step="0.01"
              value={rates.AUD}
              onChange={(e) => setRates({ ...rates, AUD: e.target.value })}
              placeholder="1.6"
            />
          </div>

          <div>
            <Label htmlFor="cad-rate">EUR to CAD Rate</Label>
            <Input
              id="cad-rate"
              type="number"
              step="0.01"
              value={rates.CAD}
              onChange={(e) => setRates({ ...rates, CAD: e.target.value })}
              placeholder="1.5"
            />
          </div>

          <div>
            <Label htmlFor="czk-rate">EUR to CZK Rate</Label>
            <Input
              id="czk-rate"
              type="number"
              step="0.01"
              value={rates.CZK}
              onChange={(e) => setRates({ ...rates, CZK: e.target.value })}
              placeholder="25.5"
            />
          </div>

          <div>
            <Label htmlFor="gbp-rate">EUR to GBP Rate</Label>
            <Input
              id="gbp-rate"
              type="number"
              step="0.01"
              value={rates.GBP}
              onChange={(e) => setRates({ ...rates, GBP: e.target.value })}
              placeholder="0.85"
            />
          </div>

          <div>
            <Label htmlFor="usd-rate">EUR to USD Rate</Label>
            <Input
              id="usd-rate"
              type="number"
              step="0.01"
              value={rates.USD}
              onChange={(e) => setRates({ ...rates, USD: e.target.value })}
              placeholder="1.1"
            />
          </div>

          <Button
            variant="primary"
            onClick={() => mutate()}
            isLoading={isPending}
            className="w-full"
          >
            {isPending ? "Updating Prices..." : "Update Currency Prices"}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Update Currency Prices",
})

export default UpdateCurrencyPricesPage