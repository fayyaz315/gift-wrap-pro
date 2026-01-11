// @ts-check

/*
A straightforward example of a function that expands a single line into a bundle with add-on products.
The add-on options are stored in metafields on the product.
*/

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = input.cart.lines.reduce(
    /** @param {Operation[]} acc */
    (acc, cartLine) => {
      const expandOperation = optionallyBuildExpandOperation(cartLine, input);

      if (expandOperation) {
        return [...acc, { lineExpand: expandOperation }];
      }

      return acc;
    },
    []
  );

  return operations.length > 0 ? { operations } : NO_CHANGES;
}

/**
 * @param {RunInput['cart']['lines'][number]} cartLine
 * @param {RunInput} input
 */
function optionallyBuildExpandOperation(
  { id: cartLineId, merchandise, cost },
  { presentmentCurrencyRate }
) {
  // Check if merchandise is a ProductVariant
  if (merchandise.__typename !== "ProductVariant") {
    return null;
  }

  // Get gift wrap variant ID from product metafield
  const giftWrapVariantID = merchandise.product?.giftWrapVariant?.value;
  
  // Check if product has both gift wrap cost and variant ID configured
  const hasGiftWrapMetafields =
    !!merchandise.product.giftWrapCost &&
    !!giftWrapVariantID;

  // Parse gift wrap cost from JSON metafield, default to 5.0
  const giftWrapCost = merchandise.product?.giftWrapCost?.value
    ? JSON.parse(merchandise.product.giftWrapCost.value).amount
    : "5.0";

  // Expand if metafields are configured (removed condition check)
  if (hasGiftWrapMetafields) {
    return {
      cartLineId,
      title: `${merchandise.title}`,
      expandedCartItems: [
        {
          merchandiseId: merchandise.id,
          quantity: 1,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: cost.amountPerQuantity.amount,
              },
            },
          },
        },
        {
          merchandiseId: giftWrapVariantID,
          quantity: 1,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: (
                  parseFloat(giftWrapCost) * presentmentCurrencyRate
                ).toFixed(1),
              },
            },
          },
        },
      ],
    };
  }

  return null;
}