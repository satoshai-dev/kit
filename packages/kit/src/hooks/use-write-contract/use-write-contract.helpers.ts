import type { ClarityValue, PostCondition } from "@stacks/transactions";
import { cvToHex, postConditionToHex } from "@stacks/transactions";

export const preparePostConditionsForOKX = (postConditions: PostCondition[]) =>
  postConditions.map((pc) => postConditionToHex(pc));

export const prepareArgsForOKX = (args: ClarityValue[]) =>
  args.map((arg) => cvToHex(arg));
