export default function TimeSelector({ selectedPeriod, onSelectPeriod }) {
  const periods = [
    { id: "24h", label: "24H" },
    { id: "7d", label: "7D" },
    { id: "30d", label: "30D" },
    { id: "all", label: "All" }
  ];
  
  return (
    <div className="flex space-x-2 mb-4">
      {periods.map(period => (
        <button
          key={period.id}
          onClick={() => onSelectPeriod(period.id)}
          className={`px-3 py-1 rounded-md text-sm ${
            selectedPeriod === period.id
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
