import type { ClarityValue, PostCondition } from "@stacks/transactions";
import { cvToHex, postConditionToHex } from "@stacks/transactions";

// OKX takes post-conditions as hex. A string is already serialized (callers
// pre-serialize types the bundled serializer can't build, e.g. the PoX
// `staking` lock), so pass it through instead of serializing it again.
export const preparePostConditionsForOKX = (
  postConditions: (string | PostCondition)[]
) =>
  postConditions.map((pc) =>
    typeof pc === "string" ? pc : postConditionToHex(pc)
  );

export const prepareArgsForOKX = (args: ClarityValue[]) =>
  args.map((arg) => cvToHex(arg));
