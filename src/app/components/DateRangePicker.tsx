import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// Adicionar estilos customizados para o DayPicker se necessário
// Mas vamos tentar usar o padrão com classes Tailwind via modifiersClassNames ou styles

export function DateRangePicker({
  date,
  setDate,
  label,
  T, // Tema
}: {
  date: DateRange | undefined;
  setDate: (range: DateRange | undefined) => void;
  label: string;
  T: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    // Não fecha automaticamente pois é range
  };

  let displayValue = "Selecione...";
  if (date?.from) {
    if (date.to) {
      displayValue = `${format(date.from, "dd/MM/yy")} - ${format(
        date.to,
        "dd/MM/yy",
      )}`;
    } else {
      displayValue = format(date.from, "dd/MM/yy");
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.sub,
          marginBottom: 4,
          display: "block",
        }}
      >
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: T.inp, // Usando o tema passado
          border: `1px solid ${isOpen ? "#4f46e5" : T.border}`,
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          color: date?.from ? T.text : T.sub,
          minWidth: 200,
        }}
      >
        <CalendarIcon size={14} color={T.sub} />
        <span style={{ flex: 1 }}>{displayValue}</span>
        {date?.from && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setDate(undefined);
            }}
            style={{
              padding: 2,
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={12} color={T.sub} />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 50,
            marginTop: 4,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: 10,
          }}
        >
          <style>{`
            .rdp {
              --rdp-cell-size: 32px;
              --rdp-accent-color: #4f46e5;
              --rdp-background-color: #e0e7ff;
              margin: 0;
            }
            .rdp-day_selected:not(.rdp-day_outside) { background-color: #4f46e5; color: white; }
            .rdp-day_selected:hover:not(.rdp-day_outside) { background-color: #4338ca; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f3f4f6; }
            
            /* Fix for text visibility in Light Mode */
            .rdp-weekday {
              color: #374151 !important;
              opacity: 1 !important;
              font-weight: 700 !important;
            }
            .rdp-day, .rdp-caption_label, .rdp-nav_button { color: ${T.text}; }
            .rdp-nav_icon { fill: ${T.text}; }
            .rdp-head_cell { color: ${T.text}; opacity: 1; font-weight: 700; }
          `}</style>
          <DayPicker
            mode="range"
            selected={date}
            onSelect={handleSelect}
            locale={ptBR}
            numberOfMonths={2}
          />
        </div>
      )}
    </div>
  );
}
