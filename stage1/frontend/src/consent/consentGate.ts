// Чистая функция гейтинга кнопки Continue: разблокируется, только когда ВСЕ
// обязательные чекбоксы отмечены. Вынесена отдельно, чтобы юнит-тестировать
// инвариант «explicit consent блокирует Continue» без рендера.

export function allRequiredChecked(
  checked: Record<string, boolean>,
  requiredIds: readonly string[],
): boolean {
  return requiredIds.every((id) => checked[id] === true);
}
