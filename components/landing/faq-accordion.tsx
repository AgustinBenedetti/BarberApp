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
          className="overflow-hidden rounded-xl border border-border"
        >
          <button
            className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-accent"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            aria-expanded={openIndex === index}
          >
            <span className="pr-4 font-medium text-foreground">
              {item.question}
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
