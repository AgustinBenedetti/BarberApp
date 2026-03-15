"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "¿Cómo cancelo un turno?",
    answer:
      "Podés cancelar tu turno hasta 2 horas antes del horario reservado. Contactanos por WhatsApp o utilizá el link que recibiste en la confirmación de tu reserva.",
  },
  {
    question: "¿Cuánto tiempo de tolerancia hay si llego tarde?",
    answer:
      "Contamos con 10 minutos de tolerancia. Pasado ese tiempo, el turno puede ser reasignado a otro cliente.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos efectivo y transferencia bancaria. Para más información sobre otros métodos de pago, consultá directamente con la barbería.",
  },
  {
    question: "¿Puedo elegir mi barbero?",
    answer:
      "¡Sí! Al momento de reservar tu turno podés seleccionar al barbero de tu preferencia, sujeto a su disponibilidad.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, index) => (
        <div
          key={index}
          className="border border-zinc-800 rounded-xl overflow-hidden"
        >
          <button
            className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-900/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            aria-expanded={openIndex === index}
          >
            <span className="font-medium text-zinc-100 pr-4">
              {item.question}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
