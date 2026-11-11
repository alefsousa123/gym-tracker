import { createContext, useContext } from "react";

export const EquipmentContext = createContext(null);

export function useEquipment() {
  const context = useContext(EquipmentContext);

  if (!context) {
    throw new Error(
      "useEquipment must be used within an EquipmentProvider."
    );
  }

  return context;
}
