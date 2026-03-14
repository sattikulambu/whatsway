/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { AlertCircle, Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState } from "../EmptyState";
import { StateDisplay } from "../StateDisplay";

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planData: {
    icon: string;
    name: string;
    features: { name: string; included: boolean }[];
    annualPrice: string;
    monthlyPrice: string;
    description: string;
    permissions: Record<string, string>;
  };
  status: string;
  billingCycle: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
}

interface SubscriptionItem {
  subscription: Subscription;
  user: User;
}

interface SubscriptionsProps {
  userId: string;
}

interface SubscriptionsResponse {
  data: SubscriptionItem[];
}

export default function Subscriptions({ userId }: SubscriptionsProps) {
  const { data, isLoading, isError, error } = useQuery<SubscriptionsResponse>({
    queryKey: ["subscriptions", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/subscriptions/user/${userId}`);
      const json = await res.json();
      console.log("🧩 Subscriptions API response:", json);
      return json;
    },
    enabled: !!userId,
  });

  const subscriptions = data?.data ?? [];

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading
        subscriptions...
      </div>
    );

  // Error State
  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title="Failed to Load Channels"
        description={"Something went wrong while fetching Channels."}
        buttonText="Try Again"
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  // Empty State
  if (subscriptions.length === 0) {
    return (
      <StateDisplay
        icon={Users}
        title="No Channels Yet"
        description="Start building your team by inviting members. They'll appear here once added."
        buttonText="Invite Team Member"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
        <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
          <tr>
            <th className="py-3 px-4 border-b">Username</th>
            <th className="py-3 px-4 border-b">Plan</th>
            <th className="py-3 px-4 border-b">Price</th>
            <th className="py-3 px-4 border-b">Status</th>
            <th className="py-3 px-4 border-b">Billing Cycle</th>
            <th className="py-3 px-4 border-b">Start Date</th>
            <th className="py-3 px-4 border-b">End Date</th>
            <th className="py-3 px-4 border-b">Auto Renew</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map(({ subscription, user }) => (
            <tr
              key={subscription.id}
              className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <td className="py-3 px-4 border-b">{user.username}</td>
              <td className="py-3 px-4 border-b">
                {subscription.planData.name}
              </td>
              <td className="py-3 px-4 border-b">
                {subscription.billingCycle === "monthly" ? (
                  <span className="text-sm font-medium">
                    {subscription.planData.monthlyPrice}
                  </span>
                ) : (
                  <span className="text-sm font-medium">
                    {subscription.planData.annualPrice}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 border-b">
                {subscription.status === "active" ? (
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    {subscription.status}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                    {subscription.status}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 border-b">
                {subscription.billingCycle}
              </td>
              <td className="py-3 px-4 border-b">
                {new Date(subscription.startDate).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 border-b">
                {new Date(subscription.endDate).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 border-b">
                {subscription.autoRenew ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
