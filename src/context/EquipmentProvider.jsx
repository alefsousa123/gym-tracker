import { EquipmentContext } from "./EquipmentContext";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

const STORAGE_KEY =
  "gym-tracker:equipment:v1";

function isValidEquipment(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string"
    )
  );
}

export function EquipmentProvider({
  children,
}) {
  const [homeEquipment, setHomeEquipment] =
    usePersistentState(
      STORAGE_KEY,
      [],
      isValidEquipment
    );

  function toggleHomeEquipment(equipmentName) {
    setHomeEquipment((previous) => {
      if (previous.includes(equipmentName)) {
        return previous.filter(
          (item) => item !== equipmentName
        );
      }

      return [
        ...previous,
        equipmentName,
      ];
    });
  }

  function clearHomeEquipment() {
    setHomeEquipment([]);
  }

  return (
    <EquipmentContext.Provider
      value={{
        homeEquipment,
        toggleHomeEquipment,
        clearHomeEquipment,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
}
