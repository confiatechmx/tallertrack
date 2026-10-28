"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderPrintSheet } from "@/components/kanban/OrderPrintSheet";
import {
  Printer,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function StandaloneOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params?.id;
  const autoPrint = searchParams?.get("auto") === "true";

  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const [{ data: rpcData, error: rpcErr }, { data: difData }] = await Promise.all([
        supabase.rpc("obtener_orden_portal_publico", { p_orden_id: orderId }),
        supabase
          .from("trabajos_diferidos")
          .select("*")
          .eq("orden_origen_id", orderId)
          .order("created_at", { ascending: false }),
      ]);

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }
      if (!rpcData || !rpcData.orden) {
        throw new Error("No se encontró la orden de servicio solicitada.");
      }

      const portal = rpcData;
      const combined = {
        ...portal.orden,
        empresa: portal.empresa,
        sucursal: portal.sucursal,
        vehiculo: portal.vehiculo,
        cliente: portal.cliente,
        mecanico: portal.mecanico,
        asesor: portal.asesor,
        servicios: portal.servicios || [],
        refacciones: portal.refacciones || [],
        llantas: portal.llantas || [],
        dvi: portal.dvi || [],
        pagos: portal.pagos || [],
        trabajos_diferidos: difData || [],
      };

      setOrderData(combined);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar la hoja de servicio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (autoPrint && orderData && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, orderData, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold">Generando documento oficial de trabajo...</p>
        <span className="text-xs text-slate-400 mt-1">Cargando datos, partidas y desglose técnico</span>
      </div>
    );
  }

  if (errorMsg || !orderData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">No se pudo cargar la orden</h2>
          <p className="text-xs text-slate-500 mb-4">{errorMsg}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={fetchOrder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </button>
            <Link
              href="/tablero"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Ir al Tablero
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = orderData.empresa?.color_primario || "#1C3EFF";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 py-6 print:py-0 px-2 sm:px-4">
      {/* Action Header (Screen Only) */}
      <div className="max-w-4xl mx-auto mb-4 bg-slate-900 text-white p-3.5 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/orden/${orderId}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la Orden</span>
          </Link>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-xs font-bold block text-slate-100">
              Hoja Oficial de Taller • #{1000 + Number(orderData.folio || 1)}
            </span>
            <span className="text-[10px] text-slate-400">
              {orderData.vehiculo?.marca} {orderData.vehiculo?.modelo} • Placas: {orderData.vehiculo?.placas}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => window.print()}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 cursor-pointer w-full sm:w-auto transition-opacity"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Sheet Content */}
      <div className="print:m-0 print:p-0">
        <OrderPrintSheet
          order={orderData}
          mechanicName={orderData.mecanico?.nombre}
          isStandalone={true}
        />
      </div>

      {/* Global Print Overrides */}
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 10mm;
        }
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, nav, footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
