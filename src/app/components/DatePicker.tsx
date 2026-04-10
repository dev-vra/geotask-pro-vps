import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { InputMask } from "@react-input/mask";

export function DatePicker({
  date,
  setDate,
  label,
  T,
  openDirection = "down",
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  label: string;
  T: any;
  openDirection?: "up" | "down";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: Date | undefined) => {
    setDate(val);
    setIsOpen(false);
  };

  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy", { locale: ptBR }));
    } else {
      setInputValue("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // If it's a full date like "dd/mm/yyyy"
    if (val.replace(/_/g, "").length === 10) {
      const parts = val.split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        
        const newDate = new Date(y, m, d);
        if (!isNaN(newDate.getTime()) && newDate.getDate() === d && newDate.getFullYear() === y) {
           setDate(newDate);
        }
      }
    } else if (val.replace(/\D/g, "").length === 0) {
      setDate(undefined);
    }
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    zIndex: 9999,
    padding: 8,
  };

  if (openDirection === "up") {
    dropdownStyle.bottom = "100%";
    dropdownStyle.marginBottom = 4;
  } else {
    dropdownStyle.top = "100%";
    dropdownStyle.marginTop = 4;
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          fontSize: 12,
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
        className="flex items-center gap-2 h-10 px-3 rounded-xl border cursor-pointer transition-all hover:border-slate-300 dark:hover:border-gray-600"
        style={{
          background: T.card,
          borderColor: T.border,
          color: date ? T.text : T.sub,
          fontSize: 13,
        }}
      >
        <CalendarIcon size={14} color={T.sub} />
        <InputMask
          mask="__/__/____"
          replacement={{ _: /\d/ }}
          value={inputValue}
          onChange={handleInputChange}
          placeholder="DD/MM/AAAA"
          onClick={(e: React.MouseEvent<HTMLInputElement>) => {
             e.stopPropagation();
             setIsOpen(true);
          }}
          style={{
            flex: 1,
            background: "transparent",
            outline: "none",
            color: "inherit",
            cursor: "text",
            width: "100%",
          }}
        />
        {date && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setDate(undefined);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              borderRadius: 4,
            }}
          >
            <X size={12} color={T.sub} />
          </div>
        )}
      </div>

      {isOpen && (
        <div style={dropdownStyle}>
          <style>{`
            .rdp { --rdp-cell-size: 24px; margin: 0; padding: 0px; }
            .rdp-nav { color: ${T.text}; }
            .rdp-head_cell { font-size: 11px; color: ${T.sub} !important; font-weight: 600; text-transform: uppercase; }
            .rdp-caption_label { font-size: 13px; font-weight: 700; color: ${T.text}; text-transform: capitalize; }
            .rdp-day { font-size: 11px; }
            .rdp-day_selected { background-color: #98af3b !important; color: white !important; }
            .rdp-day_today { font-weight: bold; color: #98af3b; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: ${T.inp}; }
          `}</style>
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleSelect}
            locale={ptBR}
          />
        </div>
      )}
    </div>
  );
}
