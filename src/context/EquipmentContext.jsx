
import {
  createContext,
  useContext,
  useState,
} from "react";

// Create a context for home equipment
const EquipmentContext = createContext(null);

// Share equipment data across the application
export function EquipmentProvider({ children }) {
  const [homeEquipment, setHomeEquipment] = useState([]);

  // Add or remove an equipment item
  function toggleHomeEquipment(equipmentName) {
    setHomeEquipment((previousEquipment) => {
      const alreadySelected =
        previousEquipment.includes(equipmentName);

      if (alreadySelected) {
        return previousEquipment.filter(
          (item) => item !== equipmentName
        );
      }

      return [...previousEquipment, equipmentName];
    });
  }

  // Reset the home setup to bodyweight only
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

// Custom hook to access home equipment
export function useEquipment() {
  const context = useContext(EquipmentContext);

  if (!context) {
    throw new Error(
      "useEquipment must be used within an EquipmentProvider."
    );
  }

  return context;
}
