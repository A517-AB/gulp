import { memo } from "react";
import type { ActivityItemProps } from "./types";
import { SingleActivity } from "./single-activity.tsx";
import { GroupedActivity } from "./grouped-activity.tsx";

/**
 * `ActivityItem` is a router component that determines how to render an item in the activity feed.
 * It checks if the item is an array (and delegates to `GroupedActivity`) or a single `Activity` (and delegates to `SingleActivity`).
 *
 * Props:
 * - `item`: The `Activity` or array of `Activity` objects to render.
 * - `onApprovePlan`: Callback for plan approvals (passed down).
 * - `approvingPlan`: State flag for plan approvals (passed down).
 * - `planApproved`: State flag indicating if plan is approved (passed down).
 * - `isNew`: Boolean indicating if this item was just added (used for animation).
 */
export const ActivityItem = memo(
    function ActivityItem({ item, onApprovePlan, approvingPlan, planApproved, isNew }: ActivityItemProps) {
        if (Array.isArray(item)) {
            return <GroupedActivity item={item} />;
        }

        return (
            <SingleActivity
                activity={item}
                onApprovePlan={onApprovePlan}
                approvingPlan={approvingPlan}
                planApproved={planApproved}
                isNew={isNew}
            />
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.isNew !== nextProps.isNew) return false;
        if (prevProps.approvingPlan !== nextProps.approvingPlan) return false;
        if (prevProps.planApproved !== nextProps.planApproved) return false;
        if (prevProps.onApprovePlan !== nextProps.onApprovePlan) return false;

        const prevItem = prevProps.item;
        const nextItem = nextProps.item;

        if (Array.isArray(prevItem) && Array.isArray(nextItem)) {
            if (prevItem.length !== nextItem.length) return false;
            return prevItem.every((prev, idx) => {
                const next = nextItem[idx];
                if (!next) return false;
                return (
                    prev.id === next.id &&
                    prev.createTime === next.createTime &&
                    JSON.stringify(prev) === JSON.stringify(next)
                );
            });
        }

        if (!Array.isArray(prevItem) && !Array.isArray(nextItem)) {
            return (
                prevItem.id === nextItem.id &&
                prevItem.createTime === nextItem.createTime &&
                JSON.stringify(prevItem) === JSON.stringify(nextItem)
            );
        }

        return false;
    }
);
export default ActivityItem;
