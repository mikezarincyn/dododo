import "@testing-library/jest-dom";

// jsdom не реализует Object URL API — стабим для тестов плеера консоли.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
  URL.revokeObjectURL = () => {};
}
