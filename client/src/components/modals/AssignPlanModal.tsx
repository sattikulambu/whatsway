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

// import { useState, useEffect, useMemo } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { useToast } from "@/hooks/use-toast";
// import { apiRequest } from "@/lib/queryClient";

// interface AssignPlanModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   user: any | null;
//   plans: any[];
//   onSuccess: () => void;
// }

// export default function AssignPlanModal({
//   open,
//   onOpenChange,
//   user,
//   plans,
//   onSuccess,
// }: AssignPlanModalProps) {
//   const { toast } = useToast();

//   // -----------------------------------------
//   // 🔥 Subscriptions state stored here
//   // -----------------------------------------
//   const [subscriptions, setSubscriptions] = useState<any[]>([]);
//   const [loadingSubs, setLoadingSubs] = useState(false);

//   const [selectedPlan, setSelectedPlan] = useState("");
//   const [planDetails, setPlanDetails] = useState<any>(null);
//   const [loading, setLoading] = useState(false);

//   /** -----------------------------------------
//    *  🔥 FETCH USER SUBSCRIPTIONS WHEN MODAL OPENS
//    * ----------------------------------------*/
//   useEffect(() => {
//     if (!open || !user?.id) return;

//     const fetchSubs = async () => {
//       try {
//         setLoadingSubs(true);
//         const res = await apiRequest(
//           "GET",
//           `/api/subscriptions/user/${user.id}`
//         );
//         const data = await res.json();

//         const list = Array.isArray(data?.data) ? data.data : [];
//         setSubscriptions(list);
//       } catch (err) {
//         console.error("Error loading subscriptions", err);
//         setSubscriptions([]);
//       } finally {
//         setLoadingSubs(false);
//       }
//     };

//     fetchSubs();
//   }, [open, user?.id]);

//   /** -----------------------------------------
//    *  AUTO SELECT ACTIVE PLAN
//    * ----------------------------------------*/
//  useEffect(() => {
//   if (!open) return;

//   if (!Array.isArray(subscriptions)) {
//     setSelectedPlan("");
//     setPlanDetails(null);
//     return;
//   }

//   // Extract correctly
//   const list = subscriptions
//     .map((item: any) => item?.subscription)
//     .filter(Boolean);

//   // Make status matching safe
//   const active = list.find((s: any) =>
//     s?.status?.toString().trim().toLowerCase() === "active"
//   );

//   if (active?.planId) {
//     setSelectedPlan(active.planId);

//     const details = plans.find((p) => p.id === active.planId);
//     setPlanDetails(details || null);
//   } else {
//     setSelectedPlan("");
//     setPlanDetails(null);
//   }
// }, [open, subscriptions, plans]);



//   /** -----------------------------------------
//    *  UPDATE DETAILS WHEN USER SELECTS PLAN
//    * ----------------------------------------*/
//   useEffect(() => {
//     if (!selectedPlan) {
//       setPlanDetails(null);
//       return;
//     }
//     const details = plans.find((p) => p.id === selectedPlan);
//     setPlanDetails(details || null);
//   }, [selectedPlan, plans]);

//   /** -----------------------------------------
//    *  UNIQUE FEATURE FILTER
//    * ----------------------------------------*/
//   const uniqueFeatures = useMemo(() => {
//     if (!planDetails?.features) return [];
//     const seen = new Set<string>();

//     return planDetails.features.filter((f: any) => {
//       const clean = f.name.trim().toLowerCase();
//       if (seen.has(clean)) return false;
//       seen.add(clean);
//       return true;
//     });
//   }, [planDetails]);

//   /** -----------------------------------------
//    *  ASSIGN PLAN
//    * ----------------------------------------*/
//   const handleAssign = async () => {
//   if (!selectedPlan) {
//     toast({
//       title: "Missing Field",
//       description: "Please select a plan.",
//       variant: "destructive",
//     });
//     return;
//   }

//   setLoading(true);

//   try {
//     const res = await apiRequest(
//       "POST",
//       "/api/assignSubscription",
//       {
//         userId: user.id,
//         planId: selectedPlan
//       }
//     );

//     const data = await res.json();

//     if (!data.success) throw new Error(data.message || "Failed");

//     toast({
//       title: "Success",
//       description: "Plan assigned successfully!",
//     });

//     onSuccess();
//     onOpenChange(false);

//   } catch (error: any) {
//     let msg = "Something went wrong";

//     if (error?.message) {
//       const index = error.message.indexOf("{");
//       if (index !== -1) {
//         try {
//           const jsonString = error.message.slice(index);
//           const parsed = JSON.parse(jsonString);
//           msg = parsed.message || msg;
//         } catch {
//           msg = error.message;
//         }
//       } else {
//         msg = error.message;
//       }
//     }

//     toast({
//       title: "Error",
//       description: msg,
//       variant: "destructive",
//     });

//   } finally {
//     setLoading(false);
//   }
// };




//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>Assign Plan to {user?.username}</DialogTitle>
//         </DialogHeader>

//         {loadingSubs ? (
//           <p>Loading user's subscription...</p>
//         ) : (
//           <div className="space-y-4 mt-4">
//             {/* PLAN DROPDOWN */}
//             <div>
//               <Label>Select Plan *</Label>
//               <select
//                 className="border rounded p-2 w-full"
//                 value={selectedPlan}
//                 onChange={(e) => setSelectedPlan(e.target.value)}
//               >
//                 <option value="">Choose a plan</option>
//                 {plans.map((p: any) => (
//                   <option key={p.id} value={p.id}>
//                     {p.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* DETAILS */}
//             {planDetails && (
//               <div className="border rounded-lg p-4 bg-muted/30">
//                 <h3 className="text-lg font-semibold">{planDetails.name}</h3>
//                 <p className="text-sm text-gray-600 mt-1">
//                   {planDetails.description}
//                 </p>

//                 <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
//                   <div><strong>Monthly:</strong> ₹{planDetails.monthlyPrice || 0}</div>
//                   <div><strong>Annual:</strong> ₹{planDetails.annualPrice || 0}</div>
//                 </div>

//                 {uniqueFeatures.length > 0 && (
//                   <div className="mt-4">
//                     <h4 className="font-medium mb-2">Features</h4>
//                     <ul className="space-y-1 text-sm">
//                       {uniqueFeatures.map((f: any, i: number) => (
//                         <li key={i}>
//                           {f.included ? "✔️" : "❌"} {f.name}
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         )}

//         <DialogFooter className="mt-6">
//           <Button variant="outline" onClick={() => onOpenChange(false)}>
//             Cancel
//           </Button>

//           <Button onClick={handleAssign} disabled={loading || !selectedPlan}>
//             {loading ? "Assigning..." : "Assign Plan"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }



import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AssignPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  plans: any[];
  onSuccess: () => void;
}

export default function AssignPlanModal({
  open,
  onOpenChange,
  user,
  plans,
  onSuccess,
}: AssignPlanModalProps) {
  const { toast } = useToast();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(""); // ❗No default value
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /** -----------------------------------------
   *  FETCH USER SUBSCRIPTIONS WHEN MODAL OPENS
   * ----------------------------------------*/
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchSubs = async () => {
      try {
        setLoadingSubs(true);
        const res = await apiRequest(
          "GET",
          `/api/subscriptions/user/${user.id}`
        );
        const data = await res.json();

        const list = Array.isArray(data?.data) ? data.data : [];
        setSubscriptions(list);
      } catch (err) {
        console.error("Error loading subscriptions", err);
        setSubscriptions([]);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubs();
  }, [open, user?.id]);

  /** -----------------------------------------
   *  UPDATE DETAILS WHEN USER SELECTS PLAN
   * ----------------------------------------*/
  useEffect(() => {
    if (!selectedPlan) {
      setPlanDetails(null);
      return;
    }
    const details = plans.find((p) => p.id === selectedPlan);
    setPlanDetails(details || null);
  }, [selectedPlan, plans]);

  useEffect(() => {
  if (open) {
    setSelectedPlan("");   // reset dropdown
    setPlanDetails(null);  // reset details
  }
}, [open]);


  /** -----------------------------------------
   *  UNIQUE FEATURES (optional)
   * ----------------------------------------*/
  const uniqueFeatures = useMemo(() => {
    if (!planDetails?.features) return [];
    const seen = new Set<string>();

    return planDetails.features.filter((f: any) => {
      const clean = f.name.trim().toLowerCase();
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [planDetails]);

  /** -----------------------------------------
   *  ASSIGN PLAN
   * ----------------------------------------*/
  const handleAssign = async () => {
    if (!selectedPlan) {
      toast({
        title: "Missing Field",
        description: "Please select a plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/assignSubscription", {
        userId: user.id,
        planId: selectedPlan,
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed");

      toast({
        title: "Success",
        description: "Plan assigned successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // Extract ACTIVE PLANS ONLY
  // ---------------------------------------
  const activeSubs = subscriptions
    .map((x: any) => x.subscription)
    .filter((s: any) => s?.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Plan to {user?.username}</DialogTitle>
        </DialogHeader>

        {loadingSubs ? (
          <p>Loading user's subscriptions...</p>
        ) : (
          <div className="space-y-4 mt-4">

            {/* ACTIVE SUBSCRIPTIONS LIST */}
            {activeSubs?.length > 0 && (
              <div className="border rounded-lg p-3 bg-green-50 text-sm">
                <strong>Active Plans:</strong>
                <ul className="mt-1 list-disc ml-4">
                  {activeSubs.map((sub: any, i: number) => (
                    <li key={i}>
                      {sub.planData?.name || "Unknown"} — till{" "}
                      {new Date(sub.endDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PLAN DROPDOWN */}
            <div>
              <Label>Select Plan *</Label>
              <select
                className="border rounded p-2 w-full"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">Choose a plan</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PLAN DETAILS */}
            {planDetails && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-lg font-semibold">{planDetails.name}</h3>
                <p className="text-sm">{planDetails.description}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Monthly:</strong> ₹{planDetails.monthlyPrice}</div>
                  <div><strong>Annual:</strong> ₹{planDetails.annualPrice}</div>
                </div>

                {uniqueFeatures.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Features:</h4>
                    <ul className="space-y-1 text-sm">
                      {uniqueFeatures.map((f: any, i: number) => (
                        <li key={i}>
                          {f.included ? "✔️" : "❌"} {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedPlan}>
            {loading ? "Assigning..." : "Assign Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
