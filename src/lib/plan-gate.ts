import "server-only";
import { redirect } from "next/navigation";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { canUseFeature, isAtLeastPlan, type Plan, type PlanFeatures } from "@/lib/plans";

/**
 * Server-side guard : redirect to /dashboard/billing if the active restaurant
 * doesn't have the required plan.
 */
export async function requirePlan(target: Plan) {
  const { restaurant, session } = await getCurrentRestaurant();
  if (!isAtLeastPlan(restaurant.plan, target)) {
    redirect(`/dashboard/billing?upgrade=${target}`);
  }
  return { restaurant, session };
}

export async function requireFeature(feature: keyof PlanFeatures) {
  const { restaurant, session } = await getCurrentRestaurant();
  if (!canUseFeature(restaurant.plan, feature)) {
    redirect(`/dashboard/billing?feature=${String(feature)}`);
  }
  return { restaurant, session };
}

export async function getFeatureUsage() {
  const { restaurant } = await getCurrentRestaurant();
  return { plan: restaurant.plan, features: restaurant.plan };
}
