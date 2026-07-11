"use client";

import React from "react";
import Price from "@/components/Price";
import { useTranslation } from "@/hooks/useTranslation";

export interface Order {
    id: string;
    sapOrderNumber: string;
    date: string;
    grandTotal: string;
    orderedBy: string;
    status: string;
}

interface OrdersTableProps {
    orders: Order[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders }) => {
    const { t } = useTranslation();
    return (
        <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block w-full bg-white border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-body text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50/80 text-black text-label font-bold uppercase tracking-widest h-[60px] border-b border-border">
                                <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("orders.orderId")}</th>
                                <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("orders.sapOrder")}</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">{t("orders.date")}</th>
                                <th className="px-6 py-4 text-right whitespace-nowrap">{t("orders.grandTotal")}</th>
                                <th className="px-6 py-4 text-center">{t("orders.orderedBy")}</th>
                                <th className="px-6 py-4 text-center">{t("orders.status")}</th>
                                <th className="px-6 py-4 text-center">{t("orders.action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders.length > 0 ? (
                                orders.map((order, idx) => (
                                    <tr
                                        key={order.id + idx}
                                        className="hover:bg-primary/5 transition-colors group h-[70px]"
                                    >
                                        <td className="px-6 py-4 font-bold text-black ltr:text-left rtl:text-right group-hover:text-primary transition-colors">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4 text-black/60 font-medium ltr:text-left rtl:text-right">
                                            {order.sapOrderNumber || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-black/50 font-mono text-center">
                                            {order.date}
                                        </td>
                                        <td className="px-6 py-4 text-black font-bold text-right whitespace-nowrap">
                                            <Price amount={order.grandTotal} />
                                        </td>
                                        <td className="px-6 py-4 text-black/60 font-bold text-center">
                                            {order.orderedBy}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-caption font-bold uppercase tracking-widest ${order.status?.toLowerCase() === 'complete' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                                {t(`data.${order.status}`) !== `data.${order.status}` ? t(`data.${order.status}`) : order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-4 text-label font-bold uppercase tracking-wider">
                                                <button className="text-black hover:text-primary transition-colors flex items-center gap-1">
                                                    {t("orders.viewOrder")}
                                                </button>
                                                <span className="text-black/30">|</span>
                                                <button className="text-black hover:text-primary transition-colors flex items-center gap-1">
                                                    {t("orders.reorder")}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <p className="text-black/50 text-xs italic tracking-[0.2em] uppercase font-bold">
                                            {t("orders.noRecords")}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {orders.length > 0 ? (
                    orders.map((order, idx) => (
                        <div
                            key={order.id + idx}
                            className="bg-white border border-border rounded-lg shadow-sm p-4 space-y-3"
                        >
                            {/* Order # + Date */}
                            <div className="flex items-center justify-between">
                                <span className="text-body font-bold text-black">
                                    #{order.id}
                                </span>
                                <span className="text-body-sm text-black/60 font-mono">
                                    {order.date}
                                </span>
                            </div>

                            {/* Status */}
                            <div>
                                <span className={`inline-block px-3 py-1 rounded-full text-caption font-bold uppercase tracking-widest ${order.status?.toLowerCase() === 'complete' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                    {t(`data.${order.status}`) !== `data.${order.status}` ? t(`data.${order.status}`) : order.status}
                                </span>
                            </div>

                            {/* SAP Order Number */}
                            {order.sapOrderNumber && (
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-black/50 uppercase tracking-wider font-bold">{t("orders.sapOrder")}</span>
                                    <span className="text-black/70 font-medium">{order.sapOrderNumber}</span>
                                </div>
                            )}

                            {/* Ordered By */}
                            {order.orderedBy && (
                                <div className="flex justify-between text-body-sm">
                                    <span className="text-black/50 uppercase tracking-wider font-bold">{t("orders.orderedBy")}</span>
                                    <span className="text-black/70 font-medium">{order.orderedBy}</span>
                                </div>
                            )}

                            {/* Grand Total */}
                            <div className="flex justify-between text-body-sm">
                                <span className="text-black/50 uppercase tracking-wider font-bold">{t("orders.grandTotal")}</span>
                                <span className="text-black font-bold">
                                    <Price amount={order.grandTotal} />
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-200 text-label font-bold uppercase tracking-wider">
                                <button className="text-black hover:text-primary transition-colors">
                                    {t("orders.viewOrder")}
                                </button>
                                <span className="text-black/30">|</span>
                                <button className="text-black hover:text-primary transition-colors">
                                    {t("orders.reorder")}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white border border-border rounded-lg px-4 py-16 text-center">
                        <p className="text-black/50 text-xs italic tracking-[0.2em] uppercase font-bold">
                            We couldn&apos;t find any records.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersTable;
