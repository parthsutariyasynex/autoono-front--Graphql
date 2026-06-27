"use client";
import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Price from "@/app/components/Price";

export interface Order {
    id: string;
    sapOrderNumber: string;
    date: string;
    grandTotal: string;
    orderedBy: string;
    status: string;
    increment_id: string;
    entity_id: string;
    is_paid?: boolean;
    company_name?: string | null;
    company_code?: string | null;
}

interface OrdersTableProps {
    orders: Order[];
    onViewOrder: (id: string) => void;
    onReorder: (order: Order) => void;
    onMakePayment?: (order: Order) => void;
    canOrder?: boolean;
    isSalesPerson?: boolean;
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onViewOrder, onReorder, onMakePayment, canOrder = true, isSalesPerson = false }) => {
    const { t } = useTranslation();
    return (
        <div className="w-full">
            {/* Desktop Table — visible at md+ so the column headers (Order # / Date /
                Grand Total / Ordered By / Status / Action) are always shown on tablet
                and up. Action column buttons stack vertically at lg to fit the narrowed
                column when the account sidebar is on. */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-body text-left border-collapse min-w-[900px] border border-[#ddd]">
                    <thead>
                        <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                            <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("orders.orderId")}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 whitespace-nowrap">{t("orders.sapOrderNumber") || "SAP Order Number"}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 whitespace-nowrap text-center">{t("orders.date")}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 whitespace-nowrap text-center">{t("orders.grandTotal")}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-center">{t("orders.orderedBy")}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 whitespace-nowrap">{t("orders.company") || "Company"}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 whitespace-nowrap">{t("orders.companyCode") || "Company Code"}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-center">{t("orders.status")}</th>
                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-center">{t("orders.action")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length > 0 ? (
                            orders.map((order, idx) => (
                                <tr
                                    key={order.increment_id + idx}
                                    className={`border-b border-gray-200 transition-colors ${isSalesPerson && order.is_paid === false ? "bg-red-50 hover:bg-red-100" : "hover:bg-primary/5"}`}
                                >
                                    <td
                                        className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body-lg font-medium cursor-pointer"
                                        onClick={() => onViewOrder(order.entity_id)}
                                    >
                                        {order.id}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body">
                                        {order.sapOrderNumber || "-"}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body whitespace-nowrap text-center">
                                        {order.date}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body-lg font-medium whitespace-nowrap text-center">
                                        <Price amount={order.grandTotal} />
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body text-center">
                                        {order.orderedBy}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body">
                                        {order.company_name || "-"}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-black text-body">
                                        {order.company_code || "-"}
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-center">
                                        <span className={`inline-flex px-2 py-1 border rounded-sm text-caption font-medium uppercase tracking-wider bg-white whitespace-nowrap ${order.status?.toLowerCase().includes('pending') ? 'border-borderStrong text-black' :
                                            order.status?.toLowerCase().includes('complete') ? 'border-green-200 text-green-700 bg-green-50' :
                                                order.status?.toLowerCase().includes('cancel') ? 'border-red-200 text-red-700 bg-red-50' :
                                                    'border-gray-200 text-black/80 bg-white'
                                            }`}>
                                            {t(`data.${order.status}`) !== `data.${order.status}` ? t(`data.${order.status}`) : order.status}
                                        </span>
                                    </td>
                                    <td className="px-2 xl:px-4 py-1.5 text-center">
                                        {/* Actions:
                                              md / lg → stack vertically (Action col is too narrow
                                                       to fit "View Order | Reorder | Make Payment" inline)
                                              xl+    → row with separators (plenty of room) */}
                                        <div className="flex flex-col xl:flex-row items-center justify-center gap-1.5 xl:gap-2.5 text-body-sm font-medium uppercase tracking-wide whitespace-nowrap">
                                            <button
                                                onClick={() => onViewOrder(order.entity_id)}
                                                className="text-black hover:text-primary transition-colors"
                                            >
                                                {t("orders.viewOrder")}
                                            </button>
                                            <span className="hidden xl:inline text-black/40 font-normal">|</span>
                                            <button
                                                onClick={() => onReorder(order)}
                                                className="text-black hover:text-primary transition-colors"
                                            >
                                                {t("orders.reorder")}
                                            </button>
                                            <span className="hidden xl:inline text-black/40 font-normal">|</span>
                                            {order.is_paid ? (
                                                <button
                                                    onClick={() => onViewOrder(order.entity_id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-[2px] font-medium transition-colors shadow-sm"
                                                >
                                                    {t("orders.viewPayment")}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onMakePayment?.(order)}
                                                    className="bg-primary hover:bg-primaryHover text-white px-4 py-1.5 rounded-sm font-medium transition-colors shadow-sm"
                                                >
                                                    {t("orders.makePayment") === "orders.makePayment" ? "Make Payment" : t("orders.makePayment")}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-black/50 italic">
                                    {t("orders.noRecords")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Card View — mobile only (below md) */}
            <div className="md:hidden space-y-3">
                {orders.length > 0 ? (
                    orders.map((order, idx) => (
                        <div
                            key={order.increment_id + idx}
                            className={`border border-[#ddd] rounded-sm p-4 space-y-3 ${isSalesPerson && order.is_paid === false ? "bg-red-50" : "bg-white"}`}
                        >
                            {/* Order number + Date */}
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-body font-medium text-black cursor-pointer"
                                    onClick={() => onViewOrder(order.entity_id)}
                                >
                                    #{order.id}
                                </span>
                                <span className="text-body-sm text-black">{order.date}</span>
                            </div>

                            {/* SAP Order # + Company */}
                            {(order.sapOrderNumber || order.company_name || order.company_code) && (
                                <div className="text-body-sm text-black/70 space-y-0.5">
                                    {order.sapOrderNumber && <div>{t("orders.sapOrderNumber") || "SAP #"}: {order.sapOrderNumber}</div>}
                                    {order.company_name && <div>{t("orders.company") || "Company"}: {order.company_name}</div>}
                                    {order.company_code && <div>{t("orders.companyCode") || "Code"}: {order.company_code}</div>}
                                </div>
                            )}

                            {/* Status badge */}
                            <div>
                                <span className={`inline-block px-2.5 py-1 border rounded-sm text-caption font-bold uppercase tracking-wider bg-white ${order.status?.toLowerCase().includes('pending') ? 'border-borderStrong text-black' :
                                    order.status?.toLowerCase().includes('complete') ? 'border-green-200 text-green-700 bg-green-50' :
                                        order.status?.toLowerCase().includes('cancel') ? 'border-red-200 text-red-700 bg-red-50' :
                                            'border-gray-300 text-black/80 bg-white'
                                    }`}>
                                    {t(`data.${order.status}`) !== `data.${order.status}` ? t(`data.${order.status}`) : order.status}
                                </span>
                            </div>

                            {/* SAP Order Number */}

                            {/* Ordered By (Ship To) */}
                            <div className="flex justify-between text-body-sm">
                                <span className="text-black">{t("orders.shipTo")}</span>
                                <span className="text-black">{order.orderedBy}</span>
                            </div>

                            {/* Order Total */}
                            <div className="flex justify-between text-body-sm">
                                <span className="text-black">{t("orders.orderTotal")}</span>
                                <span className="text-black font-medium price"><Price amount={order.grandTotal} /></span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2.5 pt-2 border-t border-[#ddd] text-body-sm">
                                <button
                                    onClick={() => onViewOrder(order.entity_id)}
                                    className="text-black font-medium"
                                >
                                    {t("orders.viewOrder")}
                                </button>
                                <span className="text-black/40">|</span>
                                <button
                                    onClick={() => onReorder(order)}
                                    className="text-black font-medium"
                                >
                                    {t("orders.reorder")}
                                </button>
                                <span className="text-black/40">|</span>
                                {order.is_paid ? (
                                    <button
                                        onClick={() => onViewOrder(order.entity_id)}
                                        className="bg-green-600 text-white px-3 py-1 rounded-[2px] font-bold"
                                    >
                                        {t("orders.viewPayment")}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onMakePayment?.(order)}
                                        className="bg-primary text-white px-3 py-1 rounded-[2px] font-bold"
                                    >
                                        {t("orders.makePayment") === "orders.makePayment" ? "Make Payment" : t("orders.makePayment")}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-10 text-center text-black/50 italic">
                        {t("orders.noRecords")}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersTable;
